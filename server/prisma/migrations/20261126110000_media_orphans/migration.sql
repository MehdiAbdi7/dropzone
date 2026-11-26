-- Les fichiers Cloudinary dont la suppression a échoué (26/11) : le balayage de l'API réessaie. Migration additive : une table.
CREATE TABLE "media_orphans" (
    "id" SERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_orphans_pkey" PRIMARY KEY ("id")
);
