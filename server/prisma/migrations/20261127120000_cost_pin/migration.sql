-- Le code à 4 chiffres des prix d'achat (27/11) : gardé chiffré, vide tant que l'admin n'en a pas réglé. Migration additive :
-- une colonne sans valeur par défaut (donc vide), aucune ligne n'est modifiée. Tant qu'elle reste vide, le back-office ne
-- cache aucun prix (le comportement d'avant).
ALTER TABLE "store_settings" ADD COLUMN "cost_pin_hash" TEXT;
