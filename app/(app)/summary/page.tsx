import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { entryBranchScope } from "@/lib/branch-scope";
import { filtersToWhere, parseFilters } from "@/lib/filters";
import { formatThb } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const filters = parseFilters(await searchParams);

  const where = { AND: [entryBranchScope(user), filtersToWhere(filters)] };

  const [incomeAgg, expenseAgg] = await Promise.all([
    prisma.entry.aggregate({
      _sum: { amount: true },
      where: { ...where, type: "INCOME" },
    }),
    prisma.entry.aggregate({
      _sum: { amount: true },
      where: { ...where, type: "EXPENSE" },
    }),
  ]);

  const income = Number(incomeAgg._sum.amount ?? 0);
  const expense = Number(expenseAgg._sum.amount ?? 0);
  const net = income - expense;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
      <SummaryCard title="รายรับรวม" amount={income} tone="green" icon={ArrowUpCircle} />
      <SummaryCard title="รายจ่ายรวม" amount={expense} tone="red" icon={ArrowDownCircle} />
      <SummaryCard title="คงเหลือสุทธิ" amount={net} tone="neutral" icon={Wallet} />
    </div>
  );
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
