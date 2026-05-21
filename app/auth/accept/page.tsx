import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

import { AcceptInviteForm } from "./AcceptInviteForm";

/// Landing page after Supabase Auth has confirmed an invite token and the
/// session cookie is set (via /auth/callback). The invitee picks a password
/// (mandatory) and confirms or changes the display name the admin assigned.
export default async function AcceptInvitePage() {
  const user = await getCurrentUser();
  if (!user) {
    // The /auth/callback exchange failed, or the link expired. Send them
    // somewhere they can ask the admin to resend.
    redirect("/login?error=invite_expired");
  }

  return (
    <main className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-primary text-2xl">ยินดีต้อนรับสู่ Finnix Film</CardTitle>
          <CardDescription>ตั้งรหัสผ่านของคุณเพื่อเริ่มใช้งานระบบรายรับ-รายจ่าย</CardDescription>
        </CardHeader>
        <CardContent>
          <AcceptInviteForm email={user.email} currentDisplayName={user.displayName} />
        </CardContent>
      </Card>
    </main>
  );
}
