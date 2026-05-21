import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <main className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-primary text-2xl">Finnix Film</CardTitle>
          <CardDescription>เข้าสู่ระบบเพื่อใช้งาน</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm next={next} initialError={error} />
        </CardContent>
      </Card>
    </main>
  );
}
