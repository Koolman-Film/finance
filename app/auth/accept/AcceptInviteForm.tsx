"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { setOwnDisplayName } from "./actions";

type Props = {
  email: string;
  currentDisplayName: string;
};

export function AcceptInviteForm({ email, currentDisplayName }: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("รหัสผ่านอย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (password !== confirm) {
      setError("รหัสผ่านยืนยันไม่ตรงกัน");
      return;
    }

    startTransition(async () => {
      // 1) Set password against Supabase Auth — must be a browser call since
      //    it relies on the session established by /auth/callback.
      const supabase = createSupabaseBrowserClient();
      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) {
        setError(pwErr.message || "ตั้งรหัสผ่านไม่สำเร็จ");
        return;
      }

      // 2) Update display name in our users table.
      const fd = new FormData();
      fd.set("displayName", displayName);
      const res = await setOwnDisplayName({ ok: false, error: "" }, fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }

      // 3) Redirect — session is already valid.
      router.replace("/summary");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="bg-muted/40 flex items-center gap-2 rounded-md border p-2.5 text-sm">
        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
        <span>
          เข้าสู่ระบบในชื่อ <span className="font-medium">{email}</span>
        </span>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="accept-name">ชื่อที่แสดง</Label>
        <Input
          id="accept-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          maxLength={100}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="accept-password">รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</Label>
        <Input
          id="accept-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="accept-confirm">ยืนยันรหัสผ่าน</Label>
        <Input
          id="accept-confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      {error && (
        <p className="text-destructive bg-destructive/5 border-destructive/20 flex items-center gap-2 rounded-md border p-2.5 text-sm">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? "กำลังตั้งค่า..." : "เริ่มใช้งานระบบ"}
      </Button>
    </form>
  );
}
