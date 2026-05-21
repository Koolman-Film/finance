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
  /// INCOME: "{brand} {model} ({license})" with any missing parts dropped. EXPENSE: null.
  car: string | null;
  /// INCOME: sold (or booked / type) product. EXPENSE: expenseDetail.
  item: string;
  amount: number;
  /// INCOME: name from the admin-managed PaymentMethod table
  /// (e.g. "เงินสด", "เงินโอน", "บัตรเครดิต"). EXPENSE: null.
  paymentMethod: string | null;
  /// EXPENSE: source name (e.g. "เงินสดย่อย"). INCOME: null.
  expenseSource: string | null;
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

function composeCar(
  brand: string | null,
  model: string | null,
  license: string | null,
): string | null {
  const parts: string[] = [];
  if (brand) parts.push(brand);
  if (model) parts.push(model);
  const text = parts.join(" ");
  if (license) return text ? `${text} (${license})` : license;
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
      paymentMethod: { select: { name: true } },
      createdBy: { select: { displayName: true } },
    },
  });

  const rows: ExportRow[] = entries.map((e) => ({
    date: e.date,
    yyyyMm: e.yyyyMm,
    branchName: e.branch.name,
    type: e.type,
    customer: e.type === "INCOME" ? e.custName : null,
    car: e.type === "INCOME" ? composeCar(e.carBrand, e.carModel, e.license) : null,
    item:
      e.type === "INCOME"
        ? e.soldProd || e.bookedProd || e.prodType || "—"
        : e.expenseDetail || "—",
    amount: Number(e.amount),
    paymentMethod: e.paymentMethod?.name ?? null,
    expenseSource: e.expenseSource?.name ?? null,
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
