-- L'atelier, étape 6 (19/11) : le remplacement sous garantie, la reprise démontée pour pièces. Migration additive.
-- Les deux valeurs d'enum ne sont pas utilisées dans cette migration (PostgreSQL l'interdit dans la même transaction).
ALTER TYPE "PartMovementKind" ADD VALUE 'salvage';
ALTER TYPE "PartMovementKind" ADD VALUE 'trade_in_use';

-- La date de fin de garantie explicite d'un appareil de remplacement : null = calculée depuis la vente.
ALTER TABLE "order_items" ADD COLUMN "warranty_until" DATE;

-- La commande qui a remplacé l'appareil d'une fiche (une seule par fiche).
ALTER TABLE "repairs" ADD COLUMN "replacement_order_id" INTEGER;
CREATE UNIQUE INDEX "repairs_replacement_order_id_key" ON "repairs"("replacement_order_id");
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_replacement_order_id_fkey" FOREIGN KEY ("replacement_order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- La reprise d'un mouvement de pièces (sans clé étrangère : la reprise démontée disparaît, la trace reste).
ALTER TABLE "part_movements" ADD COLUMN "trade_in_id" INTEGER;
