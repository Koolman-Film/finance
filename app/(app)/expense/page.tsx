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

  // Same shape as income/page.tsx — we always include all dropdown taxonomies
  // so the modal can switch INCOME⇄EXPENSE without refetching. Expense entries
  // leave the new FK columns null, but the EntryForm still needs the option
  // lists in case an admin toggles the entry type while editing.
  const taxonomySelect = { id: true, name: true } as const;
  const taxonomyOrder = [{ sortOrder: "asc" as const }, { name: "asc" as const }];
  const activeTaxonomy = {
    where: { active: true },
    orderBy: taxonomyOrder,
    select: taxonomySelect,
  };

  const [
    entries,
    branches,
    expenseSources,
    expenseGroups,
    paymentMethods,
    bookingChannels,
    carBrands,
    productTypes,
    products,
    lockedMonths,
  ] = await Promise.all([
    prisma.entry.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: {
        branch: { select: { name: true } },
        expenseSource: { select: { name: true } },
        expenseGroup: { select: { name: true } },
        createdBy: { select: { displayName: true } },
        updatedBy: { select: { displayName: true } },
        files: {
          select: { id: true, kind: true, originalName: true, sizeBytes: true, mimeType: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.branch.findMany(activeTaxonomy),
    prisma.expenseSource.findMany(activeTaxonomy),
    prisma.expenseGroup.findMany(activeTaxonomy),
    prisma.paymentMethod.findMany(activeTaxonomy),
    prisma.bookingChannel.findMany(activeTaxonomy),
    prisma.carBrand.findMany(activeTaxonomy),
    prisma.productType.findMany(activeTaxonomy),
    prisma.product.findMany(activeTaxonomy),
    prisma.monthLock.findMany({ select: { yyyyMm: true } }),
  ]);

  return (
    <EntryListView
      type="EXPENSE"
      entries={entries.map(toClientEntry)}
      branches={branches}
      expenseSources={expenseSources}
      expenseGroups={expenseGroups}
      paymentMethods={paymentMethods}
      bookingChannels={bookingChannels}
      carBrands={carBrands}
      productTypes={productTypes}
      products={products}
      lockedMonths={lockedMonths.map((l) => l.yyyyMm)}
      currentUser={user}
      openAction={
        typeof sp.add === "string" ? sp.add : typeof sp.edit === "string" ? sp.edit : null
      }
    />
  );
}
