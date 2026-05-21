import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { UsersManager } from "./UsersManager";

export default async function UsersPage() {
  await requireAdmin();
  const [users, branches] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { displayName: "asc" }],
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        branchId: true,
        active: true,
        branch: { select: { name: true } },
      },
    }),
    prisma.branch.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  const activeAdmins = users.filter((u) => u.role === "ADMIN" && u.active);
  const lastAdminId = activeAdmins.length === 1 ? activeAdmins[0].id : null;

  return (
    <UsersManager
      users={users.map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        branchId: u.branchId,
        branchName: u.branch?.name ?? null,
        active: u.active,
      }))}
      branches={branches}
      lastAdminId={lastAdminId}
    />
  );
}
