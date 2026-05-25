import { type AppUser } from "@/lib/auth";
import { entryBranchScope } from "@/lib/branch-scope";
import { filtersToWhere, parseFilters, type ListFilters } from "@/lib/filters";
import { prisma } from "@/lib/prisma";
import { formatThaiYyyyMm } from "@/lib/thai-date";

export type ExportType = "income" | "expense" | "all";

export type ExportRow = {
  date: Date;
  yyyyMm: string;
  branchName: string;
  type: "INCOME" | "EXPENSE";
  /// INCOME: customer name. EXPENSE: null.
  customer: string | null;
  /// INCOME: "{brand} {model}" (license now lives in its own column).
  /// EXPENSE: null.
  car: string | null;
  /// INCOME: license plate. EXPENSE: null.
  license: string | null;
  /// INCOME: booking channel (LINE, Facebook, Walk-in…). EXPENSE: null.
  bookingChannel: string | null;
  /// INCOME: sold product name only — no fallback. EXPENSE: null.
  soldProduct: string | null;
  /// INCOME: sold (or booked / type) product — kept as a generic summary
  /// column so the report still has a "what was this" line when soldProduct
  /// is blank. EXPENSE: expenseDetail.
  item: string;
  amount: number;
  /// INCOME: name from the admin-managed PaymentMethod table
  /// (e.g. "เงินสด", "เงินโอน", "บัตรเครดิต"). EXPENSE: null.
  paymentMethod: string | null;
  /// EXPENSE: source name (e.g. "เงินสดย่อย"). INCOME: null.
  expenseSource: string | null;
  /// EXPENSE: ADMIN-classified group name (e.g. "ค่าน้ำมัน"). INCOME: null.
  expenseGroup: string | null;
  createdByName: string | null;
};

export type ExportData = {
  rows: ExportRow[];
  filters: ListFilters;
  type: ExportType;
  scopeLabel: string;
  totalIncome: number;
  totalExpense: number;
};

function composeCar(brand: string | null, model: string | null): string | null {
  const parts: string[] = [];
  if (brand) parts.push(brand);
  if (model) parts.push(model);
  const text = parts.join(" ");
  return text || null;
}

/// Load + format the rows for an export. Caller (the route handler) has
/// already done auth and branch-scoping; we just translate the query params
/// into a filtered list.
export async function loadExportData(
  user: AppUser,
  rawParams: Record<string, string | string[] | undefined>,
): Promise<ExportData> {
  const filters = parseFilters(rawParams);
  const typeParam = typeof rawParams.type === "string" ? rawParams.type : "all";
  const type: ExportType = ["income", "expense", "all"].includes(typeParam)
    ? (typeParam as ExportType)
    : "all";

  const where = {
    AND: [
      entryBranchScope(user),
      filtersToWhere(filters),
      ...(type === "income"
        ? [{ type: "INCOME" as const }]
        : type === "expense"
          ? [{ type: "EXPENSE" as const }]
          : []),
    ],
  };

  const entries = await prisma.entry.findMany({
    where,
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    include: {
      branch: { select: { name: true } },
      expenseSource: { select: { name: true } },
      expenseGroup: { select: { name: true } },
      paymentMethod: { select: { name: true } },
      // Taxonomy relations (replaces the old free-text columns).
      bookingChannel: { select: { name: true } },
      carBrand: { select: { name: true } },
      productType: { select: { name: true } },
      bookedProduct: { select: { name: true } },
      soldProduct: { select: { name: true } },
      createdBy: { select: { displayName: true } },
    },
  });

  const rows: ExportRow[] = entries.map((e) => ({
    date: e.date,
    yyyyMm: e.yyyyMm,
    branchName: e.branch.name,
    type: e.type,
    customer: e.type === "INCOME" ? e.custName : null,
    car: e.type === "INCOME" ? composeCar(e.carBrand?.name ?? null, e.carModel) : null,
    license: e.type === "INCOME" ? e.license : null,
    bookingChannel: e.type === "INCOME" ? (e.bookingChannel?.name ?? null) : null,
    soldProduct: e.type === "INCOME" ? (e.soldProduct?.name ?? null) : null,
    item:
      e.type === "INCOME"
        ? e.soldProduct?.name || e.bookedProduct?.name || e.productType?.name || "—"
        : e.expenseDetail || "—",
    amount: Number(e.amount),
    paymentMethod: e.paymentMethod?.name ?? null,
    expenseSource: e.expenseSource?.name ?? null,
    expenseGroup: e.expenseGroup?.name ?? null,
    createdByName: e.createdBy?.displayName ?? null,
  }));

  const totalIncome = rows.filter((r) => r.type === "INCOME").reduce((s, r) => s + r.amount, 0);
  const totalExpense = rows.filter((r) => r.type === "EXPENSE").reduce((s, r) => s + r.amount, 0);

  // Human-readable label for the report header (shows what's being filtered).
  const scopeBits: string[] = [];
  if (filters.branchId) {
    const branch = entries[0]?.branch.name;
    if (branch) scopeBits.push(`สาขา: ${branch}`);
  } else if (user.role === "ADMIN") {
    scopeBits.push("ทุกสาขา");
  } else if (user.branchName) {
    scopeBits.push(`สาขา: ${user.branchName}`);
  }
  if (filters.yyyyMm) {
    scopeBits.push(`เดือน: ${formatThaiYyyyMm(filters.yyyyMm)}`);
  } else {
    scopeBits.push("ทุกเดือน");
  }

  return {
    rows,
    filters,
    type,
    scopeLabel: scopeBits.join(" · "),
    totalIncome,
    totalExpense,
  };
}

export function exportFilename(type: ExportType, ext: "xlsx" | "pdf"): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const typeSlug = type === "income" ? "income" : type === "expense" ? "expense" : "report";
  return `finnix-${typeSlug}-${stamp}.${ext}`;
}
