-- Le brouillon par variante (23/11, demande de Mehdi) : chaque variante est « draft » ou « published ».
-- Migration additive : une colonne avec une valeur par défaut, aucune donnée supprimée.
ALTER TABLE "product_variants" ADD COLUMN "status" "ProductStatus" NOT NULL DEFAULT 'published';

-- Une variante d'un produit encore en brouillon reste en brouillon : rien de nouveau n'apparaît dans la boutique.
UPDATE "product_variants" v
SET "status" = 'draft'
FROM "products" p
WHERE v."product_id" = p."id" AND p."status" = 'draft';

-- Le produit, lui, est toujours visible : sans variante publiée, la boutique le montre « indisponible ».
UPDATE "products" SET "status" = 'published' WHERE "status" = 'draft';

-- Ses prix affichés ne comptent que les variantes publiées : sans aucune, 0 et pas de prix neuf (comme un produit
-- sans variante).
UPDATE "products" p
SET "min_price" = 0, "new_price" = NULL
WHERE NOT EXISTS (
  SELECT 1 FROM "product_variants" v WHERE v."product_id" = p."id" AND v."status" = 'published'
);

CREATE INDEX "product_variants_status_idx" ON "product_variants"("status");
