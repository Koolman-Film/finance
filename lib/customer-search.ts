"use server";

import { requireUser } from "@/lib/auth";
import { entryBranchScope } from "@/lib/branch-scope";
import { prisma } from "@/lib/prisma";

export type CustomerHit = {
  custName: string | null;
  custTel: string | null;
  bookedVia: string | null;
  carBrand: string | null;
  carModel: string | null;
  license: string | null;
  lastSeenAt: string; // ISO date string for serialization across the wire
};

/// Search past income entries for a customer match. There is no Customer table
/// — we treat each (name, tel, license) combination as a distinct customer and
/// return the most recent record's car/contact details. Branch-scoped via the
/// caller's role; STAFF only ever sees their own branch's customers.
export async function searchCustomers(query: string): Promise<CustomerHit[]> {
  const user = await requireUser();
  const q = query.trim();
  if (q.length < 1) return [];

  const entries = await prisma.entry.findMany({
    where: {
      AND: [
        entryBranchScope(user),
        { type: "INCOME" },
        {
          OR: [
            { custName: { contains: q, mode: "insensitive" } },
            { custTel: { contains: q, mode: "insensitive" } },
            { carBrand: { contains: q, mode: "insensitive" } },
            { carModel: { contains: q, mode: "insensitive" } },
            { license: { contains: q, mode: "insensitive" } },
          ],
        },
        // Filter out totally-empty customer entries (no point suggesting them).
        {
          OR: [{ custName: { not: null } }, { custTel: { not: null } }, { license: { not: null } }],
        },
      ],
    },
    select: {
      custName: true,
      custTel: true,
      bookedVia: true,
      carBrand: true,
      carModel: true,
      license: true,
      date: true,
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 80, // generous overfetch — we dedup below to ~20 hits
  });

  const seen = new Set<string>();
  const hits: CustomerHit[] = [];
  for (const e of entries) {
    const key = `${(e.custName ?? "").toLowerCase()}|${e.custTel ?? ""}|${(e.license ?? "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push({
      custName: e.custName,
      custTel: e.custTel,
      bookedVia: e.bookedVia,
      carBrand: e.carBrand,
      carModel: e.carModel,
      license: e.license,
      lastSeenAt: e.date.toISOString(),
    });
    if (hits.length >= 20) break;
  }
  return hits;
}
