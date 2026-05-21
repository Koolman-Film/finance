import type { Prisma } from "@prisma/client";

export type ListFilters = {
  branchId: string | null; // null means "all"
  yyyyMm: string | null; // null means "any"
};

/// Parse Next.js searchParams into typed filter state. Strings only — Next has
/// already done the URL decoding for us.
export function parseFilters(sp: Record<string, string | string[] | undefined>): ListFilters {
  const branchId = typeof sp.branch === "string" && sp.branch !== "all" ? sp.branch : null;
  const yyyyMm = typeof sp.month === "string" && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : null;
  return { branchId, yyyyMm };
}

/// Translate user-supplied filters to a Prisma `where` fragment. Caller must
/// AND-combine this with the branch-scope where clause from `branch-scope.ts`.
export function filtersToWhere(f: ListFilters): Prisma.EntryWhereInput {
  const where: Prisma.EntryWhereInput = {};
  if (f.branchId) where.branchId = f.branchId;
  if (f.yyyyMm) where.yyyyMm = f.yyyyMm;
  return where;
}

/// Re-serialize filters back into a query string for nav links.
export function filtersToQuery(f: ListFilters): string {
  const params = new URLSearchParams();
  if (f.branchId) params.set("branch", f.branchId);
  if (f.yyyyMm) params.set("month", f.yyyyMm);
  const s = params.toString();
  return s ? `?${s}` : "";
}
