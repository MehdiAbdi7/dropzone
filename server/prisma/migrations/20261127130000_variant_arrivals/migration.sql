-- Le journal des arrivages d'un neuf (27/11) : un neuf acheté à des prix différents reste une seule variante, dont le prix
-- d'achat devient la moyenne pondérée. Migration additive : une table neuve, aucune ligne existante n'est touchée.
CREATE TABLE "variant_arrivals" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "variant_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_cost" INTEGER NOT NULL,
    "stock_after" INTEGER NOT NULL,
    "cost_after" INTEGER NOT NULL,
    "user_id" INTEGER,

    CONSTRAINT "variant_arrivals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "variant_arrivals_variant_id_idx" ON "variant_arrivals"("variant_id");

ALTER TABLE "variant_arrivals" ADD CONSTRAINT "variant_arrivals_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
