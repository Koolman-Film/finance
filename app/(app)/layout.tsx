import Link from "next/link";
import { LogOut, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { FilterBar } from "./_components/FilterBar";
import { Tabs } from "./_components/Tabs";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const branches = await prisma.branch.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  // STAFF sees only their granted branches in the filter; ADMIN sees all.
  const visibleBranches =
    user.role === "ADMIN"
      ? branches
      : branches.filter((b: { id: string; name: string }) => user.branchIds.includes(b.id));

  // "ทุกสาขา" (or "ทุกสาขาของฉัน" for multi-branch STAFF) is offered only when
  // there's actually more than one option — single-branch users don't need it.
  const isAdmin = user.role === "ADMIN";
  const canSelectAllBranches = isAdmin || visibleBranches.length > 1;
  const allBranchesLabel = isAdmin ? "ทุกสาขา" : "ทุกสาขาของฉัน";

  // Header subtitle: admin gets the omniscient line; STAFF gets a branch
  // summary that scales from "สาขา: เชียงใหม่" (one) to "สาขา: เชียงใหม่,
  // ลำพูน (2 สาขา)" (multiple).
  const subtitle = isAdmin
    ? "โหมดผู้ดูแลระบบ — ดูข้อมูลได้ทุกสาขา"
    : visibleBranches.length === 0
      ? "ยังไม่ได้กำหนดสาขา — ติดต่อผู้ดูแลระบบ"
      : visibleBranches.length === 1
        ? `สาขา: ${visibleBranches[0].name}`
        : `สาขา: ${visibleBranches.map((b) => b.name).join(", ")} (${visibleBranches.length} สาขา)`;

  return (
    <div className="mx-auto max-w-6xl min-w-0 p-4 md:p-8">
      <header className="border-primary mb-6 flex items-start justify-between gap-4 border-b-2 pb-4">
        <div>
          <h1 className="text-primary text-2xl font-bold md:text-3xl">
            ระบบจัดการรายรับ-รายจ่าย Finnix Film
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-muted-foreground hidden text-sm sm:block">{user.displayName}</span>
          {user.role === "ADMIN" && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin">
                <Settings2 className="size-4" />
                ผู้ดูแล
              </Link>
            </Button>
          )}
          <form action="/logout" method="POST">
            <Button type="submit" variant="outline" size="sm">
              <LogOut className="size-4" />
              ออกจากระบบ
            </Button>
          </form>
        </div>
      </header>

      <Tabs />
      <FilterBar
        branches={visibleBranches}
        canSelectAllBranches={canSelectAllBranches}
        allBranchesLabel={allBranchesLabel}
      />

      <div className="bg-card text-card-foreground min-h-[400px] rounded-xl border p-4 shadow-sm md:p-6">
        {children}
      </div>
    </div>
  );
}
