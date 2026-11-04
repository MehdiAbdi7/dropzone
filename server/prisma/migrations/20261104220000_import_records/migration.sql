-- La mémoire de l'import des annonces : pour chaque SKU importé, les valeurs de la
-- dernière annonce écrite. Sans clé étrangère exprès : la ligne survit à la suppression
-- de la variante, et l'import sait que le gérant l'a retirée.

-- CreateTable
CREATE TABLE "import_records" (
    "sku" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_records_pkey" PRIMARY KEY ("sku")
);
