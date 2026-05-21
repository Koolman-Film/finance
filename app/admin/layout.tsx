import Link from "next/link";
import { ArrowLeft, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";

import { AdminNav } from "./_components/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="mx-auto max-w-6xl min-w-0 p-4 md:p-8">
      <header className="border-primary mb-6 flex items-start justify-between gap-4 border-b-2 pb-4">
        <div>
          <h1 className="text-primary text-2xl font-bold md:text-3xl">โหมดผู้ดูแลระบบ</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            จัดการสาขา ผู้ใช้งาน และการตั้งค่าระบบ
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/summary">
              <ArrowLeft className="size-4" />
              กลับหน้าหลัก
            </Link>
          </Button>
          <form action="/logout" method="POST">
            <Button type="submit" variant="outline" size="sm">
              <LogOut className="size-4" />
              ออกจากระบบ
            </Button>
          </form>
        </div>
      </header>

      <p className="text-muted-foreground mb-4 text-xs">
        ลงชื่อเข้าใช้: <span className="font-medium">{user.displayName}</span> ({user.email})
      </p>

      <AdminNav />

      <div className="bg-card text-card-foreground min-h-[400px] rounded-xl border p-4 shadow-sm md:p-6">
        {children}
      </div>
    </div>
  );
}
