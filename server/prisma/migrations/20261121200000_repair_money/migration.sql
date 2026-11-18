-- L'atelier, étape 3 (18/11) : l'argent d'une réparation rendue. Migration additive : rien d'existant n'est modifié,
-- sauf une valeur ajoutée à l'enum des mouvements d'argent.

-- Cette valeur n'est pas utilisée dans cette migration (PostgreSQL l'interdit dans la même transaction).
ALTER TYPE "MovementKind" ADD VALUE 'repair';

-- Le mouvement d'argent désigne sa réparation. Pas de clé étrangère : la trace survit à la fiche supprimée.
ALTER TABLE "money_movements" ADD COLUMN "repair_id" INTEGER;
CREATE INDEX "money_movements_repair_id_idx" ON "money_movements"("repair_id");

-- Le Rendu, figé sur la fiche : le jour d'Alger, ce que le client a payé, avec quel moyen, et ce que les pièces
-- ont coûté. Le bénéfice est paid_amount - parts_cost.
ALTER TABLE "repairs" ADD COLUMN "returned_on" DATE;
ALTER TABLE "repairs" ADD COLUMN "paid_amount" INTEGER;
ALTER TABLE "repairs" ADD COLUMN "parts_cost" INTEGER;
ALTER TABLE "repairs" ADD COLUMN "pay_method" "PaymentMethod";

-- La trace de la suppression d'une réparation rendue.
ALTER TABLE "order_events" ADD COLUMN "repair_number" INTEGER;

-- Les garde-fous : même si le code se trompe, la base refuse.
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_paid_amount_check" CHECK ("paid_amount" IS NULL OR "paid_amount" >= 0);
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_parts_cost_check" CHECK ("parts_cost" IS NULL OR "parts_cost" >= 0);
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_returned_dated_check" CHECK ("status" <> 'returned' OR "returned_on" IS NOT NULL);
