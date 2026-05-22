-- Revert carModel from FK back to free-text TEXT column.
-- The admin team decided that every customer's car model + colour is unique
-- enough that maintaining a managed list adds friction without saving keystrokes.
-- We preserve existing values by joining through car_models.name before
-- dropping the FK + table.

-- 1. Add the new free-text column.
ALTER TABLE "entries" ADD COLUMN "carModel" TEXT;

-- 2. Backfill from the joined car_models.name.
UPDATE "entries" AS e
SET "carModel" = cm."name"
FROM "car_models" AS cm
WHERE e."carModelId" = cm."id";

-- 3. Drop the FK constraint and the now-unused columns/tables.
ALTER TABLE "entries" DROP CONSTRAINT "entries_carModelId_fkey";
ALTER TABLE "entries" DROP COLUMN "carModelId";
DROP TABLE "car_models";
