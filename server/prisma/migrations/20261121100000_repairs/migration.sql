-- L'atelier, étape 2 (18/11) : les fiches de réparation, leurs pièces et leurs étapes. Migration additive : rien
-- d'existant n'est modifié, sauf deux valeurs ajoutées à l'enum des mouvements de pièces et une colonne
-- facultative `repair_id` sur le journal.

CREATE TYPE "RepairStatus" AS ENUM ('received', 'quote', 'in_repair', 'ready', 'to_return', 'returned');

-- Ces deux valeurs ne sont pas utilisées dans cette migration (PostgreSQL l'interdit dans la même transaction).
ALTER TYPE "PartMovementKind" ADD VALUE 'repair';
ALTER TYPE "PartMovementKind" ADD VALUE 'repair_return';

ALTER TABLE "part_movements" ADD COLUMN "repair_id" INTEGER;

CREATE TABLE "repairs" (
    "id" SERIAL NOT NULL,
    "number" SERIAL NOT NULL,
    "status" "RepairStatus" NOT NULL DEFAULT 'received',
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "device_name" TEXT NOT NULL,
    "device_color" TEXT,
    "device_state" TEXT,
    "issue" TEXT NOT NULL,
    "accessories" TEXT,
    "labor_price" INTEGER,
    "note" TEXT,
    "under_warranty" BOOLEAN NOT NULL,
    "warranty_ends_at" DATE,
    "warranty_forced_off" BOOLEAN NOT NULL DEFAULT false,
    "origin_item_id" INTEGER,
    "origin_order_number" INTEGER,
    "created_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repairs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "repair_parts" (
    "id" SERIAL NOT NULL,
    "repair_id" INTEGER NOT NULL,
    "part_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_cost" INTEGER NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "repair_parts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "repair_events" (
    "id" SERIAL NOT NULL,
    "repair_id" INTEGER NOT NULL,
    "status" "RepairStatus" NOT NULL,
    "user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repair_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "repairs_number_key" ON "repairs"("number");
CREATE INDEX "repairs_status_created_at_idx" ON "repairs"("status", "created_at" DESC);
CREATE INDEX "repairs_phone_idx" ON "repairs"("phone");
CREATE UNIQUE INDEX "repair_parts_repair_id_part_id_key" ON "repair_parts"("repair_id", "part_id");
CREATE INDEX "repair_parts_repair_id_idx" ON "repair_parts"("repair_id");
CREATE INDEX "repair_events_repair_id_idx" ON "repair_events"("repair_id");

ALTER TABLE "repairs" ADD CONSTRAINT "repairs_origin_item_id_fkey" FOREIGN KEY ("origin_item_id") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "repair_parts" ADD CONSTRAINT "repair_parts_repair_id_fkey" FOREIGN KEY ("repair_id") REFERENCES "repairs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "repair_parts" ADD CONSTRAINT "repair_parts_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "repair_events" ADD CONSTRAINT "repair_events_repair_id_fkey" FOREIGN KEY ("repair_id") REFERENCES "repairs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Les garde-fous : même si le code se trompe, la base refuse.
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_labor_price_check" CHECK ("labor_price" IS NULL OR "labor_price" >= 0);
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_warranty_dated_check" CHECK ("under_warranty" = false OR "warranty_ends_at" IS NOT NULL);
ALTER TABLE "repair_parts" ADD CONSTRAINT "repair_parts_quantity_check" CHECK ("quantity" BETWEEN 1 AND 100);
ALTER TABLE "repair_parts" ADD CONSTRAINT "repair_parts_unit_cost_check" CHECK ("unit_cost" >= 0);
ALTER TABLE "repair_parts" ADD CONSTRAINT "repair_parts_unit_price_check" CHECK ("unit_price" >= 0);

-- Le numéro montré au client commence à 1001, comme celui des commandes : R-1001, R-1002…
ALTER SEQUENCE "repairs_number_seq" START WITH 1001 RESTART WITH 1001;
