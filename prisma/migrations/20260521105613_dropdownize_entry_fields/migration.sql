-- Promote six free-text Entry columns into admin-managed dropdown tables.
-- Each old column is backfilled to a new FK column populated from the
-- DISTINCT non-empty values found in existing rows, then dropped:
--
--   bookedVia   -> booking_channels.bookingChannelId
--   carBrand    -> car_brands.carBrandId
--   carModel    -> car_models.carModelId
--   prodType    -> product_types.productTypeId
--   bookedProd  -> products.bookedProductId
--   soldProd    -> products.soldProductId   (Product is shared booked+sold)

-- 1. New taxonomy tables ----------------------------------------------------

CREATE TABLE "booking_channels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "booking_channels_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "booking_channels_name_key" ON "booking_channels"("name");

CREATE TABLE "car_brands" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "car_brands_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "car_brands_name_key" ON "car_brands"("name");

CREATE TABLE "car_models" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "car_models_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "car_models_name_key" ON "car_models"("name");

CREATE TABLE "product_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "product_types_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "product_types_name_key" ON "product_types"("name");

CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "products_name_key" ON "products"("name");

-- 2. Seed taxonomy tables from existing entry data --------------------------
--    Empty strings and NULLs are excluded. ROW_NUMBER() gives us a stable
--    sortOrder so the dropdown is alphabetized on first render (admins can
--    reorder later via the UI when we add drag-handles).

INSERT INTO "booking_channels" ("id", "name", "sortOrder", "updatedAt")
SELECT gen_random_uuid(), name, (ROW_NUMBER() OVER (ORDER BY name) - 1)::int, CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT TRIM("bookedVia") AS name
  FROM "entries"
  WHERE "bookedVia" IS NOT NULL AND TRIM("bookedVia") <> ''
) AS distinct_channels;

INSERT INTO "car_brands" ("id", "name", "sortOrder", "updatedAt")
SELECT gen_random_uuid(), name, (ROW_NUMBER() OVER (ORDER BY name) - 1)::int, CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT TRIM("carBrand") AS name
  FROM "entries"
  WHERE "carBrand" IS NOT NULL AND TRIM("carBrand") <> ''
) AS distinct_brands;

INSERT INTO "car_models" ("id", "name", "sortOrder", "updatedAt")
SELECT gen_random_uuid(), name, (ROW_NUMBER() OVER (ORDER BY name) - 1)::int, CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT TRIM("carModel") AS name
  FROM "entries"
  WHERE "carModel" IS NOT NULL AND TRIM("carModel") <> ''
) AS distinct_models;

INSERT INTO "product_types" ("id", "name", "sortOrder", "updatedAt")
SELECT gen_random_uuid(), name, (ROW_NUMBER() OVER (ORDER BY name) - 1)::int, CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT TRIM("prodType") AS name
  FROM "entries"
  WHERE "prodType" IS NOT NULL AND TRIM("prodType") <> ''
) AS distinct_types;

-- Products: union of booked + sold (same SKU may have been booked or sold).
INSERT INTO "products" ("id", "name", "sortOrder", "updatedAt")
SELECT gen_random_uuid(), name, (ROW_NUMBER() OVER (ORDER BY name) - 1)::int, CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT TRIM("bookedProd") AS name
  FROM "entries"
  WHERE "bookedProd" IS NOT NULL AND TRIM("bookedProd") <> ''
  UNION
  SELECT DISTINCT TRIM("soldProd") AS name
  FROM "entries"
  WHERE "soldProd" IS NOT NULL AND TRIM("soldProd") <> ''
) AS distinct_products;

-- 3. Add FK columns to entries ---------------------------------------------

ALTER TABLE "entries" ADD COLUMN "bookingChannelId" UUID;
ALTER TABLE "entries" ADD COLUMN "carBrandId"       UUID;
ALTER TABLE "entries" ADD COLUMN "carModelId"       UUID;
ALTER TABLE "entries" ADD COLUMN "productTypeId"    UUID;
ALTER TABLE "entries" ADD COLUMN "bookedProductId"  UUID;
ALTER TABLE "entries" ADD COLUMN "soldProductId"    UUID;

-- 4. Backfill FKs by joining on the (trimmed) old text values --------------

UPDATE "entries" AS e
SET "bookingChannelId" = bc."id"
FROM "booking_channels" AS bc
WHERE bc."name" = TRIM(e."bookedVia") AND e."bookedVia" IS NOT NULL;

UPDATE "entries" AS e
SET "carBrandId" = cb."id"
FROM "car_brands" AS cb
WHERE cb."name" = TRIM(e."carBrand") AND e."carBrand" IS NOT NULL;

UPDATE "entries" AS e
SET "carModelId" = cm."id"
FROM "car_models" AS cm
WHERE cm."name" = TRIM(e."carModel") AND e."carModel" IS NOT NULL;

UPDATE "entries" AS e
SET "productTypeId" = pt."id"
FROM "product_types" AS pt
WHERE pt."name" = TRIM(e."prodType") AND e."prodType" IS NOT NULL;

UPDATE "entries" AS e
SET "bookedProductId" = p."id"
FROM "products" AS p
WHERE p."name" = TRIM(e."bookedProd") AND e."bookedProd" IS NOT NULL;

UPDATE "entries" AS e
SET "soldProductId" = p."id"
FROM "products" AS p
WHERE p."name" = TRIM(e."soldProd") AND e."soldProd" IS NOT NULL;

-- 5. Add FK constraints (SetNull on parent delete) -------------------------

ALTER TABLE "entries"
  ADD CONSTRAINT "entries_bookingChannelId_fkey"
  FOREIGN KEY ("bookingChannelId") REFERENCES "booking_channels"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "entries"
  ADD CONSTRAINT "entries_carBrandId_fkey"
  FOREIGN KEY ("carBrandId") REFERENCES "car_brands"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "entries"
  ADD CONSTRAINT "entries_carModelId_fkey"
  FOREIGN KEY ("carModelId") REFERENCES "car_models"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "entries"
  ADD CONSTRAINT "entries_productTypeId_fkey"
  FOREIGN KEY ("productTypeId") REFERENCES "product_types"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "entries"
  ADD CONSTRAINT "entries_bookedProductId_fkey"
  FOREIGN KEY ("bookedProductId") REFERENCES "products"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "entries"
  ADD CONSTRAINT "entries_soldProductId_fkey"
  FOREIGN KEY ("soldProductId") REFERENCES "products"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Drop legacy text columns ----------------------------------------------

ALTER TABLE "entries" DROP COLUMN "bookedVia";
ALTER TABLE "entries" DROP COLUMN "carBrand";
ALTER TABLE "entries" DROP COLUMN "carModel";
ALTER TABLE "entries" DROP COLUMN "prodType";
ALTER TABLE "entries" DROP COLUMN "bookedProd";
ALTER TABLE "entries" DROP COLUMN "soldProd";
