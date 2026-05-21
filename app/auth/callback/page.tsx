"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/// Handles Supabase Auth's email-link callbacks: invites, password reset,
/// magic links. Supabase ships tokens via either:
///   - ?code=...  (PKCE flow, modern)
///   - #access_token=...&refresh_token=...  (implicit flow, legacy)
/// We need a client page (not a server route) because the fragment never
/// reaches the server — only the browser sees it.
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackShell />}>
      <CallbackInner />
    </Suspense>
  );
}

function CallbackInner() {
  const router = useRouter();
  const search = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function handle() {
      const supabase = createSupabaseBrowserClient();
      const next = search.get("next") ?? "/summary";

      // --- PKCE flow: ?code=... ---
      const code = search.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          setError(error.message || "แลกเปลี่ยน code ไม่สำเร็จ");
          return;
        }
        router.replace(next);
        router.refresh();
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
        if (cancelled) return;
        if (error) {
          setError(error.message || "ตั้งค่า session ไม่สำเร็จ");
          return;
        }
        // Strip the fragment from the URL before navigating, otherwise it
        // tags along to the destination and confuses anything that reads it.
        window.history.replaceState(null, "", window.location.pathname);
        router.replace(next);
        router.refresh();
        return;
      }

      // Neither code nor token in URL — broken / expired link.
      setError("ลิงก์ไม่ถูกต้องหรือหมดอายุ");
    }

    handle();
    return () => {
      cancelled = true;
    };
  }, [router, search]);

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
