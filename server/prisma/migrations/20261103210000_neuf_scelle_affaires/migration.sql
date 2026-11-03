-- Deux familles seulement : le neuf scellé (`new`) et l'affaire (`refurbished`).
-- La marque « affaire » posée sur une variante disparaît.
ALTER TABLE "product_variants" DROP COLUMN "is_deal";

-- Les détails du gérant gardent leur contenu, sous un nom qui ne parle plus d'affaire
-- (un renommage, pas une suppression suivie d'un ajout).
ALTER TABLE "product_variants" RENAME COLUMN "deal_note" TO "details";

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "compatible_parts" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "with_box" BOOLEAN;

-- Les affaires déjà en base : sans boîte, jusqu'à ce que le gérant dise le contraire.
UPDATE "product_variants" SET "with_box" = false WHERE "condition" = 'refurbished';

-- Écrit à la main (Prisma ne sait pas écrire les CHECK) :
-- une affaire dit toujours si elle a sa boîte ; un neuf scellé ne le dit jamais.
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_with_box_check"
  CHECK (("condition" = 'new') = ("with_box" IS NULL));
-- une pièce compatible est forcément une pièce changée.
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_compatible_parts_check"
  CHECK ("compatible_parts" <@ "replaced_parts");
