-- New admin-managed taxonomy: กลุ่มค่าใช้จ่าย (ExpenseGroup).
-- Tracks what an expense was for (separate from ExpenseSource, which tracks
-- where the money came from). ADMIN-only on writes — enforced in app code.

CREATE TABLE "expense_groups" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "expense_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "expense_groups_name_key" ON "expense_groups"("name");

-- Nullable FK; existing expense entries start with NULL and admins assign
-- groups as they go. SetNull on delete mirrors the other taxonomy FKs.
ALTER TABLE "entries" ADD COLUMN "expenseGroupId" UUID;

ALTER TABLE "entries"
  ADD CONSTRAINT "entries_expenseGroupId_fkey"
  FOREIGN KEY ("expenseGroupId") REFERENCES "expense_groups"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
