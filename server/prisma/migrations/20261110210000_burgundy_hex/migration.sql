-- La teinte Burgundy choisie par Mehdi le 08/11 (#6b1f2e) remplace l'ancienne (#6e2a3a).
-- Une teinte réglée à la main dans Listes n'est pas touchée.
UPDATE "choices" SET "hex" = '#6b1f2e'
WHERE "group" = 'color' AND "label" = 'Burgundy' AND ("hex" IS NULL OR "hex" = '#6e2a3a');
