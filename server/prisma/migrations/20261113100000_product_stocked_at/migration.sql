-- Le dernier arrivage d'un produit (12/11) : la création, puis chaque nouvel exemplaire, nouvelle
-- variante ou hausse de stock faits dans le back-office. Les « derniers arrivages » de l'accueil
-- le suivent. Pour les produits déjà en base, on ne connaît pas mieux que leur date de création.
ALTER TABLE "products" ADD COLUMN "stocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "products" SET "stocked_at" = "created_at";

CREATE INDEX "products_status_stocked_at_idx" ON "products"("status", "stocked_at" DESC);
