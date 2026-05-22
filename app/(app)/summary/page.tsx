import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { entryBranchScope } from "@/lib/branch-scope";
import { filtersToWhere, parseFilters } from "@/lib/filters";
import { formatThb } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { formatThaiYyyyMm } from "@/lib/thai-date";
import { cn } from "@/lib/utils";

import { BranchComparisonChart, type BranchRow } from "./_components/BranchComparisonChart";
import { MonthlyTrendChart, type MonthlyRow } from "./_components/MonthlyTrendChart";
import { TopProductsCard, type TopProductRow } from "./_components/TopProductsCard";

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const filters = parseFilters(await searchParams);

  // Card totals respect both branch scope and the active filter (so they
  // match the entry list a click away).
  const where = { AND: [entryBranchScope(user), filtersToWhere(filters)] };

  // For the branch-comparison chart and the 6-month trend we always ignore
  // the month filter — the user typically wants to see the rolling history,
  // not just the slice they're inspecting.
  const wideWhere = {
    AND: [entryBranchScope(user), ...(filters.branchId ? [{ branchId: filters.branchId }] : [])],
  };

  // Build the rolling 6-month window (current month back to 5 months prior).
  const months = lastNYyyyMm(6);

  const [incomeAgg, expenseAgg, branchAgg, branchList, monthAgg, topProductsAgg] =
    await Promise.all([
      prisma.entry.aggregate({ _sum: { amount: true }, where: { ...where, type: "INCOME" } }),
      prisma.entry.aggregate({ _sum: { amount: true }, where: { ...where, type: "EXPENSE" } }),
      // Branch comparison: aggregate by branch, ignoring the month filter so the
      // bar chart shows the full picture even if the cards above are filtered.
      prisma.entry.groupBy({
        by: ["branchId", "type"],
        where: wideWhere,
        _sum: { amount: true },
      }),
      prisma.branch.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      }),
      // Monthly trend: aggregate by yyyyMm × type for the last 6 months.
      prisma.entry.groupBy({
        by: ["yyyyMm", "type"],
        where: { AND: [...wideWhere.AND, { yyyyMm: { in: months } }] },
        _sum: { amount: true },
      }),
      // Top-selling products: respect the active filters (branch + month) so
      // the ranking matches what the user is currently viewing.
      prisma.entry.groupBy({
        by: ["soldProductId"],
        where: { ...where, type: "INCOME", soldProductId: { not: null } },
        _count: { _all: true },
        _sum: { amount: true },
        orderBy: { _count: { soldProductId: "desc" } },
        take: 10,
      }),
    ]);

  // Resolve product names for the top-N list in a single follow-up query.
  const topProductIds = topProductsAgg
    .map((r) => r.soldProductId)
    .filter((id): id is string => id != null);
  const topProductRecords = topProductIds.length
    ? await prisma.product.findMany({
        where: { id: { in: topProductIds } },
        select: { id: true, name: true },
      })
    : [];
  const productNameById = new Map(topProductRecords.map((p) => [p.id, p.name]));

  const income = Number(incomeAgg._sum.amount ?? 0);
  const expense = Number(expenseAgg._sum.amount ?? 0);
  const net = income - expense;

  // Build comparison rows: one per branch the current user can see.
  const branchRows: BranchRow[] = branchList
    .map((b) => {
      const inc = branchAgg.find((r) => r.branchId === b.id && r.type === "INCOME");
      const exp = branchAgg.find((r) => r.branchId === b.id && r.type === "EXPENSE");
      return {
        branchName: b.name,
        income: Number(inc?._sum.amount ?? 0),
        expense: Number(exp?._sum.amount ?? 0),
      };
    })
    // Drop branches the user has no entries in (also drops branches outside
    // their scope since branchAgg is already scope-filtered).
    .filter((r) => r.income > 0 || r.expense > 0 || user.role === "ADMIN");

  // Build monthly trend rows.
  const monthlyRows: MonthlyRow[] = months.map((yyyyMm) => {
    const inc = monthAgg.find((r) => r.yyyyMm === yyyyMm && r.type === "INCOME");
    const exp = monthAgg.find((r) => r.yyyyMm === yyyyMm && r.type === "EXPENSE");
    const i = Number(inc?._sum.amount ?? 0);
    const e = Number(exp?._sum.amount ?? 0);
    return {
      yyyyMm,
      label: formatThaiYyyyMm(yyyyMm, { short: true }),
      income: i,
      expense: e,
      net: i - e,
    };
  });

  const topProductRows: TopProductRow[] = topProductsAgg
    .map((r) => ({
      productName: productNameById.get(r.soldProductId ?? "") ?? "—",
      quantity: r._count._all,
      revenue: Number(r._sum.amount ?? 0),
    }))
    .filter((r) => r.productName !== "—");

  // Show the cross-branch comparison only when there are 2+ branches in
  // scope — otherwise it's just a single pair of bars, redundant with the
  // monthly trend.
  const showComparison = branchRows.length > 1;
  const trendTitle = filters.branchId
    ? `แนวโน้มรายเดือน — สาขา ${branchList.find((b) => b.id === filters.branchId)?.name ?? ""}`
    : user.role === "ADMIN" && !filters.branchId
      ? "แนวโน้มรายเดือน — รวมทุกสาขา"
      : `แนวโน้มรายเดือน — สาขา ${user.branchName ?? ""}`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        <SummaryCard title="รายรับรวม" amount={income} tone="green" icon={ArrowUpCircle} />
        <SummaryCard title="รายจ่ายรวม" amount={expense} tone="red" icon={ArrowDownCircle} />
        <SummaryCard title="คงเหลือสุทธิ" amount={net} tone="neutral" icon={Wallet} />
      </div>

      {showComparison ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          <BranchComparisonChart data={branchRows} />
          <MonthlyTrendChart data={monthlyRows} title={trendTitle} />
        </div>
      ) : (
        <MonthlyTrendChart data={monthlyRows} title={trendTitle} />
      )}

      <TopProductsCard data={topProductRows} />
    </div>
  );
}

/// Generate the last N months as "YYYY-MM" strings, oldest first.
function lastNYyyyMm(n: number): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function SummaryCard({
  title,
  amount,
  tone,
  icon: Icon,
}: {
  title: string;
  amount: number;
  tone: "green" | "red" | "neutral";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const palette = {
    green:
      "border-emerald-200 bg-emerald-50 [&_.icon]:text-emerald-600 [&_.amount]:text-emerald-700",
    red: "border-red-200 bg-red-50 [&_.icon]:text-red-600 [&_.amount]:text-red-700",
    neutral: "border-border bg-muted/30 [&_.icon]:text-foreground [&_.amount]:text-foreground",
  }[tone];
  return (
    <Card className={cn("transition-shadow hover:shadow-md", palette)}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          <CardDescription className="text-xs">บาท</CardDescription>
        </div>
        <Icon className="icon size-6" />
      </CardHeader>
      <CardContent>
        <p className="amount text-2xl font-bold md:text-3xl">{formatThb(amount)}</p>
      </CardContent>
    </Card>
  );
}
