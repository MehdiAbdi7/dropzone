ALTER TABLE "products" ADD COLUMN "new_price" INTEGER;

UPDATE "products" AS product
SET "new_price" = (
  SELECT COALESCE(
    MIN(variant."price") FILTER (WHERE variant."stock" > 0),
    MIN(variant."price")
  )
  FROM "product_variants" AS variant
  WHERE variant."product_id" = product."id"
    AND variant."condition" = 'new'
);

CREATE INDEX "products_new_price_idx" ON "products"("new_price");
