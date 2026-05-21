-- Promote Entry.paymentType (enum CASH | TRANSFER) into a proper table so
-- admins can add new methods (e.g. "บัตรเครดิต", "พร้อมเพย์") via the UI.
-- Existing rows are backfilled before the old column is dropped.

-- 1. New table
CREATE TABLE "payment_methods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_methods_name_key" ON "payment_methods"("name");

-- 2. Seed the two methods that match the old enum values, in the same
--    visual order as the dropdown used to have.
INSERT INTO "payment_methods" ("id", "name", "sortOrder", "updatedAt")
VALUES
  (gen_random_uuid(), 'เงินสด', 0, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'เงินโอน', 1, CURRENT_TIMESTAMP);

-- 3. Add the FK column to entries (nullable — EXPENSE rows leave it null).
ALTER TABLE "entries" ADD COLUMN "paymentMethodId" UUID;

-- 4. Backfill from the old enum column.
UPDATE "entries"
SET "paymentMethodId" = (SELECT "id" FROM "payment_methods" WHERE "name" = 'เงินสด')
WHERE "paymentType" = 'CASH';

UPDATE "entries"
SET "paymentMethodId" = (SELECT "id" FROM "payment_methods" WHERE "name" = 'เงินโอน')
WHERE "paymentType" = 'TRANSFER';

-- 5. Hook up the FK now that data is consistent.
ALTER TABLE "entries"
  ADD CONSTRAINT "entries_paymentMethodId_fkey"
  FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Drop the legacy column and enum.
ALTER TABLE "entries" DROP COLUMN "paymentType";
DROP TYPE "PaymentType";
