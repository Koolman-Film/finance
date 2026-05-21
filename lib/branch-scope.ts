import type { Prisma } from "@prisma/client";

import type { AppUser } from "@/lib/auth";

/// Build the Prisma `where` clause that enforces branch visibility for the
/// current user. ADMIN sees everything; STAFF only sees their own branch.
/// Layer this onto any user-supplied filters server-side, never client-side.
export function entryBranchScope(user: AppUser): Prisma.EntryWhereInput {
  if (user.role === "ADMIN") return {};
  if (!user.branchId) {
    // Staff without an assigned branch can see nothing. Fail closed.
    return { id: "00000000-0000-0000-0000-000000000000" };
  }
  return { branchId: user.branchId };
}

/// Check whether the current user is allowed to write (create or modify) an
/// entry that belongs to `targetBranchId`. ADMIN always; STAFF only for their
/// own branch.
export function canWriteToBranch(user: AppUser, targetBranchId: string): boolean {
  if (user.role === "ADMIN") return true;
  return user.branchId === targetBranchId;
}
