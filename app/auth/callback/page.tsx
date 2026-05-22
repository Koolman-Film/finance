"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/// Handles Supabase Auth's email-link callbacks: invites, password reset,
/// magic links. Supabase ships tokens via either:
///   - ?code=...  (PKCE flow, modern)
///   - #access_token=...&refresh_token=...  (implicit flow, legacy)
/// We need a client page (not a server route) because the fragment never
/// reaches the server — only the browser sees it.
///
/// Re-click resilience: a Supabase email link's underlying token is single-
/// use. If the invitee clicks the email link a second time (e.g. they opened
/// it once, walked away, then re-opened from their inbox) the second exchange
/// fails. We tolerate that by checking whether a valid session is already
/// present from the first click — if yes, we forward them to `next` instead
/// of showing a scary error.
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackShell />}>
      <CallbackInner />
    </Suspense>
  );
}

function CallbackInner() {
  const search = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handle() {
      const supabase = createSupabaseBrowserClient();
      const next = search.get("next") ?? "/summary";

      // --- Supabase-side errors first: when the verify endpoint rejects the
      //     token (expired, malformed, wrong project) it tacks the reason onto
      //     the redirect URL. Show it instead of silently bouncing.
      const supabaseErr = search.get("error_description") ?? search.get("error");
      const errorCode = search.get("error_code");
      if (supabaseErr || errorCode) {
        const expired =
          errorCode === "otp_expired" ||
          (supabaseErr ?? "").toLowerCase().includes("expired") ||
          (supabaseErr ?? "").toLowerCase().includes("invalid");
        setError(
          expired
            ? "ลิงก์หมดอายุหรือถูกใช้ไปแล้ว — กรุณาขอลิงก์ใหม่จากผู้ดูแลระบบ"
            : (supabaseErr ?? "ลิงก์ไม่ถูกต้อง"),
        );
        return;
      }

      // --- PKCE flow: ?code=... ---
      const code = search.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          // Full reload so the server-rendered destination sees the new
          // session cookie that Supabase just wrote. Using Next's router
          // here was unreliable — the destination's RSC fetch sometimes
          // raced the cookie write and bounced back to /login.
          window.location.replace(next);
          return;
        }
        // Code was likely already consumed by an earlier click. If a session
        // is still cached on this device, forward anyway — the invitee just
        // needs the password-set form, not another fresh token.
        const { data: session } = await supabase.auth.getSession();
        if (session.session) {
          window.location.replace(next);
          return;
        }
        setError(
          "ลิงก์นี้ถูกใช้ไปแล้ว — หากคุณตั้งรหัสผ่านยังไม่เสร็จ กรุณาขอลิงก์ใหม่จากผู้ดูแลระบบ",
        );
        return;
      }

      // --- Implicit flow: #access_token=...&refresh_token=... ---
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setError(error.message || "ตั้งค่า session ไม่สำเร็จ");
          return;
        }
        window.location.replace(next);
        return;
      }

      // Same re-entry fallback for naked /auth/callback hits (e.g. the user
      // bookmarked it after the first successful exchange).
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        window.location.replace(next);
        return;
      }

      // Neither code nor token in URL — broken / expired link.
      setError("ลิงก์ไม่ถูกต้องหรือหมดอายุ");
    }

    handle();
  }, [search]);

  return <CallbackShell error={error} />;
}

function CallbackShell({ error }: { error?: string | null } = {}) {
  return (
    <main className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-primary text-xl">กำลังตรวจสอบลิงก์...</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="space-y-3">
              <p className="text-destructive bg-destructive/5 border-destructive/20 flex items-start gap-2 rounded-md border p-2.5 text-sm">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {error}
              </p>
              <p className="text-muted-foreground text-xs">
                หากลิงก์หมดอายุ กรุณาขอคำเชิญใหม่จากผู้ดูแลระบบ
              </p>
              <a href="/login" className="text-primary text-sm underline">
                กลับไปหน้าเข้าสู่ระบบ
              </a>
            </div>
          ) : (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              กำลังตรวจสอบและเตรียมระบบ...
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
