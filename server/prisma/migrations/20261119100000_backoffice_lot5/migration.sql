-- Lot 5 du back-office magasin (15/11) : les échanges et les reprises.
-- Un échange est une commande de type « exchange » (le client rend un téléphone et en prend un autre).
-- Le téléphone repris attend dans `trade_ins`, hors du catalogue, jusqu'à sa mise en vente : aucune
-- lecture du site n'a à l'écarter. Additif : l'ancienne API continue de fonctionner (elle ne lit
-- ni la nouvelle valeur, ni la nouvelle table).

ALTER TYPE "OrderType" ADD VALUE IF NOT EXISTS 'exchange';

CREATE TABLE "trade_ins" (
  "id" SERIAL NOT NULL,
  "order_id" INTEGER NOT NULL,
  "device_model_id" INTEGER NOT NULL,
  "color" TEXT NOT NULL,
  "sheet" JSONB NOT NULL DEFAULT '{}',
  "price" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "listed_at" TIMESTAMP(3),
  "listed_variant_id" INTEGER,
  CONSTRAINT "trade_ins_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "trade_ins_price_check" CHECK ("price" >= 0)
);

CREATE UNIQUE INDEX "trade_ins_order_id_key" ON "trade_ins"("order_id");
CREATE INDEX "trade_ins_listed_at_idx" ON "trade_ins"("listed_at");
CREATE INDEX "trade_ins_device_model_id_idx" ON "trade_ins"("device_model_id");

ALTER TABLE "trade_ins"
  ADD CONSTRAINT "trade_ins_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "trade_ins_device_model_id_fkey" FOREIGN KEY ("device_model_id") REFERENCES "device_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
