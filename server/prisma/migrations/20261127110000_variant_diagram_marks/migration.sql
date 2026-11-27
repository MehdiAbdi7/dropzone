-- Les points posés à la main sur le dessin d'un reconditionné (27/11) : une pièce remplacée ou un défaut visible ajouté à la
-- main n'est dans aucune zone du dessin, le gérant clique donc pour le placer. Migration additive : une colonne avec une
-- valeur par défaut, aucune ligne existante n'est modifiée (toutes gardent « aucun point »).
ALTER TABLE "product_variants" ADD COLUMN "diagram_marks" JSONB NOT NULL DEFAULT '{}';
