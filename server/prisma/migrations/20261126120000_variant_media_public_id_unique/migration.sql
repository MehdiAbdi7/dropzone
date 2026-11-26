-- Un fichier Cloudinary ne peut être celui que d'un seul média (26/11) : supprimer l'un supprimerait le fichier de l'autre.
-- Migration additive : un index unique sur une table créée le jour même, sans donnée à reprendre.
CREATE UNIQUE INDEX "variant_media_public_id_key" ON "variant_media"("public_id");
