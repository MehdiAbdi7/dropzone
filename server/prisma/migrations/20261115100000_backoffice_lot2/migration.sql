-- Lot 2 du back-office magasin (15/11) : le journal des modifications et suppressions de commande.
-- Pas de clé étrangère sur order_id : la trace survit à la suppression de sa commande.

CREATE TYPE "OrderEventKind" AS ENUM ('edited', 'deleted');

CREATE TABLE "order_events" (
  "id" SERIAL NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "kind" "OrderEventKind" NOT NULL,
  "order_id" INTEGER,
  "order_number" INTEGER NOT NULL,
  "user_id" INTEGER,
  "summary" TEXT NOT NULL,
  "amount_delta" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "order_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "order_events_created_at_idx" ON "order_events"("created_at");
CREATE INDEX "order_events_order_id_idx" ON "order_events"("order_id");
