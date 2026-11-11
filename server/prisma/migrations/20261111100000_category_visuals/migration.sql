-- L'affichage des catégories (11/11) : la catégorie mise en avant de l'accueil (une seule à la
-- fois, garanti par un index unique partiel) et la photo de chaque marque. Aucune ligne existante
-- n'est modifiée ; les compositions de photos des catégories réutilisent la table stage_slots.
ALTER TABLE "categories" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "categories_featured_key" ON "categories" ("featured") WHERE "featured";

ALTER TABLE "brands" ADD COLUMN "photo_url" TEXT, ADD COLUMN "photo_public_id" TEXT;
