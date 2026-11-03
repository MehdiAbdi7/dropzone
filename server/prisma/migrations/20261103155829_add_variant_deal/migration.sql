-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "deal_note" TEXT,
ADD COLUMN     "is_deal" BOOLEAN NOT NULL DEFAULT false;

-- Les variantes qui ont déjà des articles offerts étaient des affaires : on les garde.
UPDATE "product_variants" SET "is_deal" = true WHERE "id" IN (SELECT "variant_id" FROM "variant_gifts");
