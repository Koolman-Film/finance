import { prisma } from "@/lib/prisma";

import { LocksManager } from "./LocksManager";

export default async function LocksPage() {
  const locks = await prisma.monthLock.findMany({
    orderBy: { yyyyMm: "desc" },
    include: { lockedBy: { select: { displayName: true, email: true } } },
  });

  return (
    <LocksManager
      locks={locks.map((l) => ({
        yyyyMm: l.yyyyMm,
        note: l.note,
        lockedAt: l.lockedAt.toISOString(),
        lockedByName: l.lockedBy?.displayName ?? l.lockedBy?.email ?? null,
      }))}
    />
  );
}
