-- Les photos et la vidéo d'une variante (26/11, demande de Mehdi). Migration additive : une table et un type, aucune donnée touchée.
CREATE TYPE "MediaKind" AS ENUM ('photo', 'video');

CREATE TABLE "variant_media" (
    "id" SERIAL NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "url" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "variant_media_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "variant_media_variant_id_idx" ON "variant_media"("variant_id");

ALTER TABLE "variant_media" ADD CONSTRAINT "variant_media_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
