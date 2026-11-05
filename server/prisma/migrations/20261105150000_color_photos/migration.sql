-- CreateTable
CREATE TABLE "model_color_photos" (
    "id" SERIAL NOT NULL,
    "device_model_id" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "public_id" TEXT,

    CONSTRAINT "model_color_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "model_color_photos_device_model_id_color_key" ON "model_color_photos"("device_model_id", "color");

-- AddForeignKey
ALTER TABLE "model_color_photos" ADD CONSTRAINT "model_color_photos_device_model_id_fkey" FOREIGN KEY ("device_model_id") REFERENCES "device_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Un produit au plus par modèle d'appareil (étape Couleur : la page d'une couleur ajoute
-- toujours dans la fiche du modèle). Partiel : les accessoires n'ont pas de modèle.
-- Écrit à la main, Prisma ne sait pas déclarer un index partiel.
CREATE UNIQUE INDEX "products_device_model_id_key" ON "products"("device_model_id") WHERE "device_model_id" IS NOT NULL;
