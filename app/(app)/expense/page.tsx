import { requireUser } from "@/lib/auth";
import { entryBranchScope } from "@/lib/branch-scope";
import { filtersToWhere, parseFilters } from "@/lib/filters";
import { prisma } from "@/lib/prisma";

import { EntryListView } from "../_components/EntryListView";
import { toClientEntry } from "../_components/types";

export default async function ExpensePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const filters = parseFilters(sp);

  const where = {
    AND: [entryBranchScope(user), filtersToWhere(filters), { type: "EXPENSE" as const }],
  };

  const [entries, branches, expenseSources, lockedMonths] = await Promise.all([
    prisma.entry.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: {
        branch: { select: { name: true } },
        expenseSource: { select: { name: true } },
        createdBy: { select: { displayName: true } },
        updatedBy: { select: { displayName: true } },
        files: {
          select: { id: true, kind: true, originalName: true, sizeBytes: true, mimeType: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.branch.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.expenseSource.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.monthLock.findMany({ select: { yyyyMm: true } }),
  ]);

  return (
    <EntryListView
      type="EXPENSE"
      entries={entries.map(toClientEntry)}
      branches={branches}
      expenseSources={expenseSources}
      lockedMonths={lockedMonths.map((l) => l.yyyyMm)}
      currentUser={user}
      openAction={
        typeof sp.add === "string" ? sp.add : typeof sp.edit === "string" ? sp.edit : null
      }
    />
  );
}
