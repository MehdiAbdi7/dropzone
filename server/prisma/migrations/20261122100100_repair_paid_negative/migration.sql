-- L'atelier, étape 6 : un remplacement moins cher que l'appareil d'origine, le magasin RENDU de l'argent : `paid_amount`
-- est alors négatif. Seulement pour une fiche qui porte son remplacement ; toute autre fiche garde un montant >= 0.
ALTER TABLE "repairs" DROP CONSTRAINT "repairs_paid_amount_check";
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_paid_amount_check" CHECK ("paid_amount" IS NULL OR "paid_amount" >= 0 OR "replacement_order_id" IS NOT NULL);
