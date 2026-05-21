"use server";

import { requireUser } from "@/lib/auth";
import { entryBranchScope } from "@/lib/branch-scope";
import { prisma } from "@/lib/prisma";

/// Returned to the customer-search dialog. The 3 taxonomy fields carry both
/// the FK id (for pre-filling the dropdown) and the display name (so the
/// dialog can show "Toyota / Camry 2.5G สีดำ" without a second lookup).
export type CustomerHit = {
  custName: string | null;
  custTel: string | null;
  license: string | null;
  bookingChannelId: string | null;
  bookingChannelName: string | null;
  carBrandId: string | null;
  carBrandName: string | null;
  carModelId: string | null;
  carModelName: string | null;
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
            { license: { contains: q, mode: "insensitive" } },
            // Traverse the new FK relations so "Toyota" / "Camry" still match.
            { carBrand: { name: { contains: q, mode: "insensitive" } } },
            { carModel: { name: { contains: q, mode: "insensitive" } } },
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
      license: true,
      bookingChannelId: true,
      bookingChannel: { select: { name: true } },
      carBrandId: true,
      carBrand: { select: { name: true } },
      carModelId: true,
      carModel: { select: { name: true } },
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
      license: e.license,
      bookingChannelId: e.bookingChannelId,
      bookingChannelName: e.bookingChannel?.name ?? null,
      carBrandId: e.carBrandId,
      carBrandName: e.carBrand?.name ?? null,
      carModelId: e.carModelId,
      carModelName: e.carModel?.name ?? null,
      lastSeenAt: e.date.toISOString(),
    });
    if (hits.length >= 20) break;
  }
  return hits;
}
