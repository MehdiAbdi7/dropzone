-- Les téléphones compatibles d'une variante d'accessoire (12/11) : chaque taille d'un verre
-- incassable a sa liste, réglée dans le back-office. Table de liaison implicite de Prisma
-- (A = device_models.id, B = product_variants.id), effacée avec la variante ou le modèle.
CREATE TABLE "_VariantCompatibleModels" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_VariantCompatibleModels_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "_VariantCompatibleModels_B_index" ON "_VariantCompatibleModels"("B");

ALTER TABLE "_VariantCompatibleModels" ADD CONSTRAINT "_VariantCompatibleModels_A_fkey" FOREIGN KEY ("A") REFERENCES "device_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_VariantCompatibleModels" ADD CONSTRAINT "_VariantCompatibleModels_B_fkey" FOREIGN KEY ("B") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
