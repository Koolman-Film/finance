"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Loader2,
  Mail,
  MailPlus,
  Pencil,
  ShieldAlert,
  Trash2,
  UserPlus,
  UserX,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  cleanupAuthOrphans,
  createUser,
  deleteUser,
  resendInvite,
  updateUser,
  type ActionResult,
} from "@/lib/admin-actions";

const IDLE: ActionResult = { ok: false, error: "" };

type User = {
  id: string;
  email: string;
  displayName: string;
  role: "ADMIN" | "STAFF";
  /// User.branchId — the "preferred default" used to pre-fill the new-entry
  /// form. Set when a STAFF user has exactly one branch; null otherwise.
  defaultBranchId: string | null;
  defaultBranchName: string | null;
  /// Full access list (UserBranch grants). Empty for ADMIN; never empty for
  /// STAFF (server enforces "at least one").
  branchIds: string[];
  active: boolean;
};

type Branch = { id: string; name: string };

export function UsersManager({
  users,
  branches,
  lastAdminId,
  currentUserId,
}: {
  users: User[];
  branches: Branch[];
  lastAdminId: string | null;
  currentUserId: string;
}) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">ผู้ใช้งานทั้งหมด ({users.length})</h2>
        <div className="flex items-center gap-2">
          <CleanupOrphansButton />
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus className="size-4" />
            เพิ่มผู้ใช้
          </Button>
        </div>
      </div>

      {lastAdminId && (
        <p className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
          <ShieldAlert className="size-4 shrink-0" />
          เหลือผู้ดูแลระบบคนเดียวในระบบ — บทบาทและสถานะของคนนี้ถูกล็อคไว้
          จนกว่าจะเพิ่มผู้ดูแลระบบคนใหม่
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th className="p-3 font-medium">ชื่อ</th>
              <th className="p-3 font-medium">อีเมล</th>
              <th className="p-3 font-medium">บทบาท</th>
              <th className="p-3 font-medium">สาขา</th>
              <th className="p-3 font-medium">สถานะ</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                branches={branches}
                protectedLastAdmin={u.id === lastAdminId}
                isSelf={u.id === currentUserId}
              />
            ))}
          </tbody>
        </table>
      </div>

      <AddUserDialog open={addOpen} onOpenChange={setAddOpen} branches={branches} />
    </div>
  );
}

function UserRow({
  user,
  branches,
  protectedLastAdmin,
  isSelf,
}: {
  user: User;
  branches: Branch[];
  protectedLastAdmin: boolean;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(user.displayName);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function patch(p: {
    displayName?: string;
    role?: "ADMIN" | "STAFF";
    branchIds?: string[];
    active?: boolean;
  }) {
    setError(null);
    startTransition(async () => {
      const res = await updateUser(user.id, p);
      if (!res.ok) setError(res.error);
    });
  }

  function saveName() {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === user.displayName) {
      setEditingName(false);
      setNameDraft(user.displayName);
      return;
    }
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const res = await updateUser(user.id, { displayName: trimmed });
      if (!res.ok) setError(res.error);
      else setEditingName(false);
    });
  }

  function resend() {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const res = await resendInvite(user.id);
      if (!res.ok) setError(res.error);
      else setInfo(`ส่งคำเชิญใหม่ไปยัง ${user.email} แล้ว`);
    });
  }

  function remove() {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const res = await deleteUser(user.id);
      if (!res.ok) {
        setError(res.error);
        setConfirmDelete(false);
      }
      // On success the row disappears via revalidatePath, so no local state to reset.
    });
  }

  const canDelete = !isSelf && !protectedLastAdmin;

  // When this row is the only active admin, lock role + active controls.
  // The server enforces the same rule; the disabled state prevents the
  // dropdown from showing a stale value before the server rejection lands.
  const lockReason = protectedLastAdmin ? "เป็นผู้ดูแลระบบคนสุดท้าย ห้ามแก้ไข" : undefined;

  return (
    <tr className="border-b">
      <td className="p-3 font-medium">
        {editingName ? (
          <div className="flex items-center gap-1">
            <Input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              disabled={pending}
              autoFocus
              className="h-8"
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") {
                  setNameDraft(user.displayName);
                  setEditingName(false);
                }
              }}
            />
            <Button type="button" size="sm" onClick={saveName} disabled={pending}>
              {pending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setNameDraft(user.displayName);
                setEditingName(false);
              }}
              disabled={pending}
            >
              <X className="size-3" />
            </Button>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1">
            {user.displayName}
            {protectedLastAdmin && (
              <ShieldAlert
                className="inline size-3.5 text-amber-600"
                aria-label="ผู้ดูแลระบบคนสุดท้าย"
              />
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setEditingName(true)}
              className="size-6 p-0 opacity-60 hover:opacity-100"
              title="แก้ไขชื่อ"
            >
              <Pencil className="size-3" />
            </Button>
          </span>
        )}
      </td>
      <td className="text-muted-foreground p-3">
        <div className="flex items-center gap-1">
          <span>{user.email}</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={resend}
            disabled={pending}
            className="size-6 p-0 opacity-60 hover:opacity-100"
            title="ส่งคำเชิญใหม่ (รหัสเก่าจะใช้ไม่ได้)"
          >
            {pending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <MailPlus className="size-3" />
            )}
          </Button>
        </div>
      </td>
      <td className="p-3">
        <Select
          value={user.role}
          onValueChange={(v) => {
            // STAFF → ADMIN: clear all branch grants (admin sees everything).
            // ADMIN → STAFF: keep any existing grants; if empty, seed with the
            // first available branch so the server's "STAFF must have ≥ 1"
            // guard doesn't reject the role swap.
            const nextRole = v as "ADMIN" | "STAFF";
            const nextBranchIds =
              nextRole === "ADMIN"
                ? []
                : user.branchIds.length > 0
                  ? user.branchIds
                  : branches[0]
                    ? [branches[0].id]
                    : [];
            patch({ role: nextRole, branchIds: nextBranchIds });
          }}
          disabled={pending || protectedLastAdmin}
        >
          <SelectTrigger className="h-8 w-32" title={lockReason}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="STAFF">Staff</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="p-3">
        {user.role === "STAFF" ? (
          <BranchMultiSelect
            value={user.branchIds}
            options={branches}
            onChange={(next) => patch({ branchIds: next })}
            disabled={pending}
          />
        ) : (
          <span className="text-muted-foreground text-xs">— ทุกสาขา —</span>
        )}
      </td>
      <td className="p-3">
        <Button
          size="sm"
          variant={user.active ? "secondary" : "outline"}
          onClick={() => patch({ active: !user.active })}
          disabled={pending || protectedLastAdmin}
          title={lockReason}
        >
          {pending && <Loader2 className="size-3 animate-spin" />}
          {user.active ? "ใช้งาน" : "ปิดใช้งาน"}
        </Button>
        {error && (
          <p className="text-destructive mt-1 flex items-center gap-1 text-xs">
            <AlertCircle className="size-3" /> {error}
          </p>
        )}
        {info && (
          <p className="mt-1 flex items-center gap-1 text-xs text-emerald-700">
            <CheckCircle2 className="size-3" /> {info}
          </p>
        )}
      </td>
      <td className="p-3 text-right">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setConfirmDelete(true)}
          disabled={pending || !canDelete}
          title={
            isSelf
              ? "ลบบัญชีของตัวเองไม่ได้"
              : protectedLastAdmin
                ? "ผู้ดูแลระบบคนสุดท้าย ลบไม่ได้"
                : "ลบบัญชี"
          }
          className="text-destructive hover:bg-destructive/10 hover:text-destructive size-8 p-0 disabled:opacity-30"
        >
          <Trash2 className="size-4" />
        </Button>
        <DeleteUserDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          user={user}
          onConfirm={remove}
          pending={pending}
        />
      </td>
    </tr>
  );
}

/// Button that scans Supabase Auth and removes rows that no longer have a
/// matching app-side User. Surfaces a transient confirmation so the admin
/// knows whether any cleanup happened.
function CleanupOrphansButton() {
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function run() {
    setMessage(null);
    startTransition(async () => {
      const res = await cleanupAuthOrphans();
      setConfirmOpen(false);
      if (!res.ok) {
        setMessage({ kind: "err", text: res.error || "ลบ orphan ไม่สำเร็จ" });
        return;
      }
      const n = res.removed?.length ?? 0;
      setMessage({
        kind: "ok",
        text:
          n === 0
            ? `ตรวจสอบแล้ว ${res.checked ?? 0} บัญชี — ไม่มี orphan ใน Supabase Auth`
            : `ลบ orphan ${n} บัญชี: ${res.removed!.join(", ")}`,
      });
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setConfirmOpen(true)}
        disabled={pending}
        title="ลบบัญชี Supabase Auth ที่ไม่มีอยู่ในตารางผู้ใช้แล้ว"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <UserX className="size-4" />}
        ล้าง auth orphan
      </Button>
      {message && (
        <p
          className={
            message.kind === "ok"
              ? "flex items-center gap-1 text-xs text-emerald-700"
              : "text-destructive flex items-center gap-1 text-xs"
          }
        >
          {message.kind === "ok" ? (
            <CheckCircle2 className="size-3" />
          ) : (
            <AlertCircle className="size-3" />
          )}
          {message.text}
        </p>
      )}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ล้างบัญชี Supabase Auth ที่ไม่ใช้แล้ว</DialogTitle>
            <DialogDescription>
              ตรวจสอบและลบ user ใน Supabase Auth ที่ไม่มี row ในตาราง ผู้ใช้ของแอปอีกแล้ว
              (เช่นถูกลบจาก Supabase Table Editor โดยตรง)
            </DialogDescription>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            ผู้ใช้ที่ยังมีอยู่ในระบบจะไม่ถูกแตะต้อง — เฉพาะ orphan เท่านั้น
          </p>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmOpen(false)}
              disabled={pending}
            >
              ยกเลิก
            </Button>
            <Button type="button" className="flex-1" onClick={run} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <UserX className="size-4" />}
              เริ่มล้าง
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DeleteUserDialog({
  open,
  onOpenChange,
  user,
  onConfirm,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onConfirm: () => void;
  pending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">ลบบัญชีผู้ใช้</DialogTitle>
          <DialogDescription>
            ลบบัญชี <span className="font-medium">{user.displayName}</span> ({user.email}) อย่างถาวร
            — ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้อีก
          </DialogDescription>
        </DialogHeader>
        <div className="text-muted-foreground space-y-2 text-sm">
          <p>
            รายการรายรับ/รายจ่ายที่ผู้ใช้คนนี้บันทึกไว้ <strong>จะยังคงอยู่</strong> แต่ช่อง
            &ldquo;ผู้บันทึก&rdquo; จะเป็นค่าว่าง
          </p>
          <p className="text-destructive">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
        </div>
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="flex-1"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            ลบถาวร
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddUserDialog({
  open,
  onOpenChange,
  branches,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
}) {
  const [state, formAction, pending] = useActionState(createUser, IDLE);
  const [role, setRole] = useState<"ADMIN" | "STAFF">("STAFF");
  // Initialize with the first branch checked so a single-click STAFF invite
  // doesn't require the admin to also open the popover. Cleared when role
  // flips to ADMIN.
  const [branchIds, setBranchIds] = useState<string[]>(branches[0] ? [branches[0].id] : []);

  useEffect(() => {
    if (state && "ok" in state && state.ok) onOpenChange(false);
  }, [state, onOpenChange]);

  const fieldErrors: Record<string, string> =
    state && "ok" in state && !state.ok && "fieldErrors" in state ? (state.fieldErrors ?? {}) : {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>เชิญผู้ใช้ใหม่</DialogTitle>
          <DialogDescription>ระบบจะส่งอีเมลคำเชิญ — ผู้รับจะตั้งรหัสผ่านเอง</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="role" value={role} />
          {/* HTML forms can't carry arrays. Comma-join here; the server
              schema splits it back into a string[]. */}
          <input
            type="hidden"
            name="branchIds"
            value={role === "STAFF" ? branchIds.join(",") : ""}
          />

          <div className="space-y-1.5">
            <Label htmlFor="add-email">อีเมล</Label>
            <Input id="add-email" name="email" type="email" required />
            {fieldErrors.email && <p className="text-destructive text-xs">{fieldErrors.email}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-name">ชื่อที่แสดง (ผู้ใช้แก้ไขได้เองภายหลัง)</Label>
            <Input id="add-name" name="displayName" required />
            {fieldErrors.displayName && (
              <p className="text-destructive text-xs">{fieldErrors.displayName}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>บทบาท</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "ADMIN" | "STAFF")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STAFF">Staff (พนักงานสาขา)</SelectItem>
                <SelectItem value="ADMIN">Admin (ผู้ดูแลระบบ)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role === "STAFF" && (
            <div className="space-y-1.5">
              <Label>สาขา (ติ๊กได้หลายสาขา)</Label>
              <BranchMultiSelect
                value={branchIds}
                options={branches}
                onChange={setBranchIds}
                disabled={pending}
              />
              {fieldErrors.branchIds && (
                <p className="text-destructive text-xs">{fieldErrors.branchIds}</p>
              )}
            </div>
          )}

          {state && "ok" in state && !state.ok && state.error && (
            <p className="bg-destructive/5 border-destructive/20 text-destructive flex items-center gap-1.5 rounded-md border p-2 text-sm">
              <AlertCircle className="size-4" /> {state.error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              ยกเลิก
            </Button>
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
              {pending ? "กำลังส่ง..." : "ส่งคำเชิญ"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/// Compact multi-branch picker — popover with checkboxes. Used both inline in
/// the user row (admin can re-assign branches on the fly) and in the invite
/// dialog. Auto-saves via the onChange callback; caller decides whether to
/// fire on every toggle or batch.
function BranchMultiSelect({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string[];
  options: Branch[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const selectedNames = options.filter((b) => value.includes(b.id)).map((b) => b.name);
  const label =
    selectedNames.length === 0
      ? "เลือกสาขา"
      : selectedNames.length === 1
        ? selectedNames[0]
        : `${selectedNames.length} สาขา`;

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-44 justify-between"
          disabled={disabled}
          title={selectedNames.length > 1 ? selectedNames.join(", ") : undefined}
        >
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="max-h-64 space-y-0.5 overflow-y-auto">
          {options.length === 0 ? (
            <p className="text-muted-foreground p-2 text-xs">ยังไม่มีสาขา</p>
          ) : (
            options.map((b) => {
              const checked = value.includes(b.id);
              return (
                <label
                  key={b.id}
                  className="hover:bg-muted/60 flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(b.id)}
                    className="size-3.5"
                  />
                  {b.name}
                </label>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
