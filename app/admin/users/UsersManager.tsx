"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { AlertCircle, Check, Loader2, Pencil, Plus, ShieldAlert, UserPlus, X } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUser, updateUser, type ActionResult } from "@/lib/admin-actions";

const IDLE: ActionResult = { ok: false, error: "" };

type User = {
  id: string;
  email: string;
  displayName: string;
  role: "ADMIN" | "STAFF";
  branchId: string | null;
  branchName: string | null;
  active: boolean;
};

type Branch = { id: string; name: string };

export function UsersManager({
  users,
  branches,
  lastAdminId,
}: {
  users: User[];
  branches: Branch[];
  lastAdminId: string | null;
}) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">ผู้ใช้งานทั้งหมด ({users.length})</h2>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="size-4" />
          เพิ่มผู้ใช้
        </Button>
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
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                branches={branches}
                protectedLastAdmin={u.id === lastAdminId}
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
}: {
  user: User;
  branches: Branch[];
  protectedLastAdmin: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(user.displayName);

  function patch(p: {
    displayName?: string;
    role?: "ADMIN" | "STAFF";
    branchId?: string | null;
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
    startTransition(async () => {
      const res = await updateUser(user.id, { displayName: trimmed });
      if (!res.ok) setError(res.error);
      else setEditingName(false);
    });
  }

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
      <td className="text-muted-foreground p-3">{user.email}</td>
      <td className="p-3">
        <Select
          value={user.role}
          onValueChange={(v) =>
            patch({
              role: v as "ADMIN" | "STAFF",
              branchId: v === "ADMIN" ? null : (user.branchId ?? branches[0]?.id ?? null),
            })
          }
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
          <Select
            value={user.branchId ?? ""}
            onValueChange={(v) => patch({ branchId: v || null })}
            disabled={pending}
          >
            <SelectTrigger className="h-8 w-40">
              <SelectValue placeholder="เลือกสาขา" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      </td>
    </tr>
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
  const [branchId, setBranchId] = useState<string>(branches[0]?.id ?? "");

  useEffect(() => {
    if (state && "ok" in state && state.ok) onOpenChange(false);
  }, [state, onOpenChange]);

  const fieldErrors: Record<string, string> =
    state && "ok" in state && !state.ok && "fieldErrors" in state ? (state.fieldErrors ?? {}) : {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>เพิ่มผู้ใช้ใหม่</DialogTitle>
          <DialogDescription>สร้างบัญชี Supabase Auth พร้อมกำหนดสิทธิ์ในระบบ</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="role" value={role} />
          <input type="hidden" name="branchId" value={role === "STAFF" ? branchId : ""} />

          <div className="space-y-1.5">
            <Label htmlFor="add-email">อีเมล</Label>
            <Input id="add-email" name="email" type="email" required />
            {fieldErrors.email && <p className="text-destructive text-xs">{fieldErrors.email}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-name">ชื่อที่แสดง</Label>
            <Input id="add-name" name="displayName" required />
            {fieldErrors.displayName && (
              <p className="text-destructive text-xs">{fieldErrors.displayName}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-password">รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)</Label>
            <Input id="add-password" name="password" type="password" required minLength={8} />
            {fieldErrors.password && (
              <p className="text-destructive text-xs">{fieldErrors.password}</p>
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
              <Label>สาขา</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.branchId && (
                <p className="text-destructive text-xs">{fieldErrors.branchId}</p>
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
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {pending ? "กำลังสร้าง..." : "สร้างผู้ใช้"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
