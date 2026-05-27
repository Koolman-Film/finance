import { cache } from "react";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppUser = {
  id: string;
  email: string;
  displayName: string;
  role: "ADMIN" | "STAFF";
  /// User's "preferred default" branch — pre-fills the new-entry form. Null
  /// for ADMIN and for multi-branch STAFF (who must pick explicitly).
  branchId: string | null;
  branchName: string | null;
  /// Full access list. For STAFF this is the set of branches they can read
  /// + write. ADMIN has access to every branch unconditionally — branchIds
  /// is the empty array for ADMIN and callers must check role before using it.
  branchIds: string[];
};

/// Returns the authenticated app user (Supabase session ∩ our `users` table)
/// or null if signed out / not yet provisioned. Cached for the duration of a
/// single React render so multiple components can call it without re-querying.
export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      branch: { select: { name: true } },
      branches: { select: { branchId: true } },
    },
  });
  if (!row || !row.active) return null;

  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role,
    branchId: row.branchId,
    branchName: row.branch?.name ?? null,
    branchIds: row.branches.map((b) => b.branchId),
  };
});

/// Force-redirect to /login if the request has no session. For protected pages.
export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<AppUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
