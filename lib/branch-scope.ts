import type { Prisma } from "@prisma/client";

import type { AppUser } from "@/lib/auth";

/// Build the Prisma `where` clause that enforces branch visibility for the
/// current user. ADMIN sees everything; STAFF sees only branches in their
/// grant list (UserBranch). Layer this onto any user-supplied filters
/// server-side, never client-side.
export function entryBranchScope(user: AppUser): Prisma.EntryWhereInput {
  if (user.role === "ADMIN") return {};
  if (user.branchIds.length === 0) {
    // Staff without any branch grants can see nothing. Fail closed.
    return { id: "00000000-0000-0000-0000-000000000000" };
  }
  return { branchId: { in: user.branchIds } };
}

/// Check whether the current user is allowed to write (create or modify) an
/// entry that belongs to `targetBranchId`. ADMIN always; STAFF only for
/// branches in their grant list.
export function canWriteToBranch(user: AppUser, targetBranchId: string): boolean {
  if (user.role === "ADMIN") return true;
  return user.branchIds.includes(targetBranchId);
}
