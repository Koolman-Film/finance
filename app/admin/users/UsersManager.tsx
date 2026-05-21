"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { AlertCircle, Loader2, Plus, UserPlus } from "lucide-react";

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

export function UsersManager({ users, branches }: { users: User[]; branches: Branch[] }) {
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
              <UserRow key={u.id} user={u} branches={branches} />
            ))}
          </tbody>
        </table>
      </div>

      <AddUserDialog open={addOpen} onOpenChange={setAddOpen} branches={branches} />
    </div>
  );
}

function UserRow({ user, branches }: { user: User; branches: Branch[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function patch(p: { role?: "ADMIN" | "STAFF"; branchId?: string | null; active?: boolean }) {
    setError(null);
    startTransition(async () => {
      const res = await updateUser(user.id, p);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <tr className="border-b">
      <td className="p-3 font-medium">{user.displayName}</td>
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
          disabled={pending}
        >
          <SelectTrigger className="h-8 w-32">
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
          disabled={pending}
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
