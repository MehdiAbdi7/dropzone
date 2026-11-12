ALTER TABLE "product_variants"
ADD COLUMN "stocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "product_variants" AS variant
SET "stocked_at" = product."stocked_at"
FROM "products" AS product
WHERE variant."product_id" = product."id";

CREATE INDEX "product_variants_stocked_at_idx"
ON "product_variants"("stocked_at" DESC);
