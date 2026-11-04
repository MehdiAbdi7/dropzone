-- Le vrai catalogue de DropZone (partie B) : les tablettes, trois listes du back-office,
-- et la garantie, l'origine et la référence de chaque appareil.

-- AlterEnum
ALTER TYPE "ChoiceGroup" ADD VALUE 'sim';
ALTER TYPE "ChoiceGroup" ADD VALUE 'gpu';
ALTER TYPE "ChoiceGroup" ADD VALUE 'origin';

-- AlterEnum
ALTER TYPE "ProductKind" ADD VALUE 'tablet';

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "warranty_months" INTEGER;

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "origin" TEXT,
ADD COLUMN     "reference" TEXT,
ADD COLUMN     "warranty_months" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_reference_key" ON "product_variants"("reference");

-- Écrit à la main (Prisma ne sait pas écrire les CHECK) :
-- une affaire reste un appareil unique, mais sa note et sa batterie deviennent
-- facultatives : les annonces de PC n'en donnent presque jamais.
ALTER TABLE "product_variants" DROP CONSTRAINT "product_variants_refurbished_check";
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_refurbished_check"
  CHECK ("condition" = 'new' OR "stock" <= 1);
-- une affaire dit avec ou sans boîte, ou rien (null : « Boîte non précisée », pour une
-- annonce importée qui n'en parle pas) ; un neuf scellé ne le dit jamais.
ALTER TABLE "product_variants" DROP CONSTRAINT "product_variants_with_box_check";
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_with_box_check"
  CHECK ("condition" = 'refurbished' OR "with_box" IS NULL);
-- une garantie de 1 à 36 mois.
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_warranty_check"
  CHECK ("warranty_months" IS NULL OR "warranty_months" BETWEEN 1 AND 36);

-- Les appareils déjà en base reçoivent la garantie par défaut de DropZone :
-- PC 3 mois ; téléphone ou montre 12 mois en neuf scellé, 6 mois en affaire.
UPDATE "product_variants" AS v
SET "warranty_months" = CASE
  WHEN c."kind" = 'laptop' THEN 3
  WHEN v."condition" = 'new' THEN 12
  ELSE 6
END
FROM "products" AS p
JOIN "categories" AS c ON c."id" = p."category_id"
WHERE p."id" = v."product_id" AND c."kind" IN ('phone', 'laptop', 'watch');
