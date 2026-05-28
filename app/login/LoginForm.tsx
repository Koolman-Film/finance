"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/// /login is a state machine with three views:
///   - "login" : email + password sign-in (default)
///   - "forgot": email-only form that sends a password-reset email
///   - "sent"  : confirmation screen after a successful reset request
/// The email field carries between login → forgot so a half-typed sign-in
/// becomes a one-click "I meant to reset that" without retyping.
type Mode = "login" | "forgot" | "sent";

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [pending, startTransition] = useTransition();

  function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        return;
      }
      router.replace(next || "/summary");
      router.refresh();
    });
  }

  function handleForgot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      // resetPasswordForEmail emails a recovery link that lands on
      // /auth/callback (which exchanges the code for a session) and then
      // forwards to /auth/accept where the user picks a new password.
      // We compute redirectTo from window.location.origin so preview
      // deployments stay self-contained — a preview's reset email
      // shouldn't bounce the user into production.
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        "/auth/accept",
      )}`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });

      // Enumeration safety: we show the same success screen whether the
      // email exists or not. The single exception is rate-limit feedback —
      // the user already knows they just clicked submit, so telling them
      // "wait a moment" leaks nothing useful to an attacker.
      if (error) {
        const code = error.code ?? "";
        const msg = error.message?.toLowerCase() ?? "";
        const rateLimited = code === "over_email_send_rate_limit" || msg.includes("rate limit");
        if (rateLimited) {
          setError("ส่งคำขอบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง");
          return;
        }
        // Anything else (network glitches, invalid email format) is silently
        // treated as "we processed the request" — same as success — so we
        // never reveal which emails are in our system.
      }
      setMode("sent");
    });
  }

  function backToLogin() {
    setError(null);
    setMode("login");
  }

  if (mode === "sent") {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50">
          <CheckCircle2 className="size-6 text-emerald-600" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold">ตรวจสอบอีเมลของคุณ</p>
          <p className="text-muted-foreground text-sm">
            หากอีเมล <span className="font-medium">{email}</span> มีอยู่ในระบบ
            ลิงก์รีเซ็ตรหัสผ่านจะถูกส่งไปภายในไม่กี่นาที (ลิงก์ใช้ได้ 24 ชั่วโมง)
          </p>
        </div>
        <Button type="button" variant="outline" onClick={backToLogin} className="w-full">
          <ArrowLeft className="size-4" />
          กลับไปหน้าเข้าสู่ระบบ
        </Button>
      </div>
    );
  }

  if (mode === "forgot") {
    return (
      <form onSubmit={handleForgot} className="space-y-4">
        <p className="text-muted-foreground text-sm">
          กรอกอีเมลที่ใช้สมัครสมาชิก เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="forgot-email">อีเมล</Label>
          <Input
            id="forgot-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </div>
        {error && (
          <div className="text-destructive bg-destructive/5 border-destructive/20 flex items-center gap-2 rounded-md border p-2.5 text-sm">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={backToLogin}
            className="flex-1"
            disabled={pending}
          >
            <ArrowLeft className="size-4" />
            ยกเลิก
          </Button>
          <Button type="submit" disabled={pending} className="flex-1">
            {pending && <Loader2 className="size-4 animate-spin" />}
            {pending ? "กำลังส่ง..." : "ส่งลิงก์"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">อีเมล</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="password">รหัสผ่าน</Label>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode("forgot");
            }}
            className="text-primary text-xs hover:underline"
          >
            ลืมรหัสผ่าน?
          </button>
        </div>
        <Input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && (
        <div className="text-destructive bg-destructive/5 border-destructive/20 flex items-center gap-2 rounded-md border p-2.5 text-sm">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </Button>
    </form>
  );
}
