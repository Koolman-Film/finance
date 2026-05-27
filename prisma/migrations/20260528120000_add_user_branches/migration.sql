-- Multi-branch staff: a STAFF user may now have access to several branches.
-- We add a join table for the full access list and backfill it from the
-- existing one-shot users.branchId so no one loses access on day one.
-- users.branchId stays as a nullable "preferred default" hint for the
-- new-entry form (only meaningful when the user has exactly one branch).

CREATE TABLE "user_branches" (
    "userId"    UUID NOT NULL,
    "branchId"  UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_branches_pkey" PRIMARY KEY ("userId", "branchId")
);

CREATE INDEX "user_branches_branchId_idx" ON "user_branches"("branchId");

ALTER TABLE "user_branches"
  ADD CONSTRAINT "user_branches_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_branches"
  ADD CONSTRAINT "user_branches_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every user with a non-null branchId today gets the matching grant.
-- ADMIN users with a branchId also get one — harmless, since ADMIN scope
-- ignores grants anyway, and it keeps "branchId is in grants" invariant
-- consistent across roles.
INSERT INTO "user_branches" ("userId", "branchId")
SELECT id, "branchId" FROM "users" WHERE "branchId" IS NOT NULL
ON CONFLICT DO NOTHING;
