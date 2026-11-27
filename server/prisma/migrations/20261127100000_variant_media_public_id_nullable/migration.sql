-- La vidéo d'une variante est désormais le lien d'un Reel Instagram (27/11) : aucun fichier chez Cloudinary, donc pas
-- d'identifiant de fichier. Migration additive : elle assouplit une contrainte, aucune ligne n'est touchée ni perdue. L'index
-- unique reste en place (Postgres laisse plusieurs valeurs vides), donc deux photos ne partagent toujours pas un fichier.
ALTER TABLE "variant_media" ALTER COLUMN "public_id" DROP NOT NULL;
