-- Lot 1 du back-office magasin (14/11) : types de commande, retrait au magasin, numéro du jour,
-- journal des mouvements d'argent, journée de caisse, horaires du magasin, prix d'achat.

-- Les nouveaux états d'un retrait.
ALTER TYPE "OrderStatus" ADD VALUE 'reserved';
ALTER TYPE "OrderStatus" ADD VALUE 'picked_up';
ALTER TYPE "OrderStatus" ADD VALUE 'expired';

CREATE TYPE "OrderType" AS ENUM ('delivery', 'pickup', 'in_store');
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'baridimob', 'ccp', 'card', 'transfer');
CREATE TYPE "MovementKind" AS ENUM ('sale', 'pickup', 'delivery', 'exchange', 'correction');

-- Les commandes : type, numéro du jour, retrait ; l'adresse devient facultative (retrait, magasin).
ALTER TABLE "orders"
  ADD COLUMN "type" "OrderType" NOT NULL DEFAULT 'delivery',
  ADD COLUMN "daily_number" INTEGER,
  ADD COLUMN "business_date" DATE,
  ADD COLUMN "pickup_date" DATE,
  ADD COLUMN "pickup_time" TEXT,
  ADD COLUMN "reserved_until" TIMESTAMP(3),
  ALTER COLUMN "wilaya" DROP NOT NULL,
  ALTER COLUMN "commune" DROP NOT NULL,
  ALTER COLUMN "address" DROP NOT NULL;

CREATE TABLE "daily_counters" (
  "date" DATE NOT NULL,
  "value" INTEGER NOT NULL,
  CONSTRAINT "daily_counters_pkey" PRIMARY KEY ("date")
);

-- Reprise des commandes d'avant le lot 1 (14/11) : toutes sont des livraisons, numérotées dans
-- leur journée d'Alger (UTC+1 toute l'année, created_at est rangé en UTC), dans l'ordre de passage.
UPDATE "orders" AS o
SET "type" = 'delivery', "daily_number" = r.n, "business_date" = r.d
FROM (
  SELECT "id",
         ("created_at" + interval '1 hour')::date AS d,
         row_number() OVER (PARTITION BY ("created_at" + interval '1 hour')::date ORDER BY "created_at", "id") AS n
  FROM "orders"
) AS r
WHERE o."id" = r."id";

-- Les compteurs repartent après le dernier numéro de chaque journée reprise.
INSERT INTO "daily_counters" ("date", "value")
SELECT "business_date", max("daily_number") FROM "orders" GROUP BY "business_date"
ON CONFLICT ("date") DO UPDATE SET "value" = EXCLUDED."value";

ALTER TABLE "orders"
  ALTER COLUMN "daily_number" SET NOT NULL,
  ALTER COLUMN "business_date" SET NOT NULL,
  -- Une livraison a toujours son adresse ; un retrait, son jour, son heure et sa fin de réservation.
  ADD CONSTRAINT "orders_delivery_address_check"
    CHECK ("type" <> 'delivery' OR ("wilaya" IS NOT NULL AND "commune" IS NOT NULL AND "address" IS NOT NULL)),
  ADD CONSTRAINT "orders_pickup_slot_check"
    CHECK ("type" <> 'pickup' OR ("pickup_date" IS NOT NULL AND "pickup_time" IS NOT NULL AND "reserved_until" IS NOT NULL));

CREATE INDEX "orders_status_reserved_until_idx" ON "orders"("status", "reserved_until");
CREATE INDEX "orders_business_date_idx" ON "orders"("business_date");

-- Le prix d'achat : sur la variante, et figé sur chaque ligne vendue.
ALTER TABLE "product_variants" ADD COLUMN "purchase_price" INTEGER;
ALTER TABLE "order_items" ADD COLUMN "unit_cost" INTEGER;
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_purchase_price_check" CHECK ("purchase_price" IS NULL OR "purchase_price" >= 0);

CREATE TABLE "cash_days" (
  "id" SERIAL NOT NULL,
  "date" DATE NOT NULL,
  "opening_float" INTEGER NOT NULL,
  "counted_cash" INTEGER,
  "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closed_at" TIMESTAMP(3),
  "opened_by_id" INTEGER,
  "closed_by_id" INTEGER,
  CONSTRAINT "cash_days_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cash_days_amounts_check" CHECK ("opening_float" >= 0 AND ("counted_cash" IS NULL OR "counted_cash" >= 0))
);
CREATE UNIQUE INDEX "cash_days_date_key" ON "cash_days"("date");

CREATE TABLE "money_movements" (
  "id" SERIAL NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "business_date" DATE NOT NULL,
  "amount" INTEGER NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "kind" "MovementKind" NOT NULL,
  "order_id" INTEGER,
  "user_id" INTEGER,
  "note" TEXT,
  CONSTRAINT "money_movements_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "money_movements_business_date_idx" ON "money_movements"("business_date");
CREATE INDEX "money_movements_order_id_idx" ON "money_movements"("order_id");

CREATE TABLE "store_settings" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "opening_time" TEXT NOT NULL DEFAULT '09:00',
  "closing_time" TEXT NOT NULL DEFAULT '20:00',
  "closed_days" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "store_settings_single_row_check" CHECK ("id" = 1)
);
INSERT INTO "store_settings" DEFAULT VALUES;
