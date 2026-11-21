-- Les catégories de pièces (21/11) : Batterie, Afficheur… créées à la main dans le back-office, et chaque pièce
-- rangée dans l'une d'elles. Migration additive : les pièces déjà là sont rangées, rien n'est supprimé.

CREATE TABLE "part_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_categories_pkey" PRIMARY KEY ("id")
);

-- Le nom est unique sans tenir compte de la casse ni des espaces autour, comme celui des pièces. Prisma ne décrit
-- pas cet index.
CREATE UNIQUE INDEX "part_categories_name_key" ON "part_categories" (lower(btrim("name")));

-- Une catégorie de départ : la liste n'est jamais vide, et les pièces existantes y ont leur place.
INSERT INTO "part_categories" ("name") VALUES ('Batterie');
-- Les pièces dont le nom ne commence pas par « Batterie » vont dans « Autres » (créée seulement s'il y en a).
INSERT INTO "part_categories" ("name")
SELECT 'Autres' WHERE EXISTS (SELECT 1 FROM "parts" WHERE lower("name") NOT LIKE 'batterie%');

ALTER TABLE "parts" ADD COLUMN "category_id" INTEGER;
UPDATE "parts" SET "category_id" = (SELECT "id" FROM "part_categories" WHERE "name" = 'Autres') WHERE lower("name") NOT LIKE 'batterie%';
UPDATE "parts" SET "category_id" = (SELECT "id" FROM "part_categories" WHERE "name" = 'Batterie') WHERE "category_id" IS NULL;
ALTER TABLE "parts" ALTER COLUMN "category_id" SET NOT NULL;

-- RESTRICT : la base refuse de supprimer une catégorie qui contient encore des pièces.
ALTER TABLE "parts" ADD CONSTRAINT "parts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "part_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "parts_category_id_idx" ON "parts"("category_id");
