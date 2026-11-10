-- La teinte de chaque couleur, réglée par le gérant dans Listes (pastilles et lueurs).
ALTER TABLE "choices" ADD COLUMN     "hex" TEXT;

-- Une teinte en minuscules (« #f47d3c »), et seulement pour la liste des couleurs.
ALTER TABLE "choices" ADD CONSTRAINT "choices_hex_format"
  CHECK ("hex" IS NULL OR ("group" = 'color' AND "hex" ~ '^#[0-9a-f]{6}$'));

-- Les teintes écrites jusqu'ici dans le front (client/src/config/colors.ts), plus Orange
-- (mesurée sur la photo de l'iPhone 17 Pro Max) et Or rose. Une couleur absente garde
-- null : le gérant choisit sa teinte dans Listes.
UPDATE "choices" AS c SET "hex" = v.hex
FROM (VALUES
  ('Noir', '#1d1d1f'), ('Blanc', '#f5f5f0'), ('Bleu', '#3a5f9e'), ('Rouge', '#c8102e'),
  ('Vert', '#4b7a5a'), ('Rose', '#f2c4ce'), ('Violet', '#6e5a8c'), ('Jaune', '#f3d65c'),
  ('Argent', '#d9d9de'), ('Gris sidéral', '#535150'), ('Minuit', '#232a35'),
  ('Lumière stellaire', '#ece5d8'), ('Titane naturel', '#bfb6a8'), ('Titane noir', '#3c3c3d'),
  ('Titane bleu', '#3c4a63'), ('Titane blanc', '#efeee9'), ('Titane gris', '#8a8a87'),
  ('Graphite', '#41424c'), ('Bordeaux', '#6b1f2e'), ('Glacier', '#cfe3ee'),
  ('Orange', '#f47d3c'), ('Or rose', '#e6c7c2')
) AS v(label, hex)
WHERE c."group" = 'color' AND c."label" = v.label;
