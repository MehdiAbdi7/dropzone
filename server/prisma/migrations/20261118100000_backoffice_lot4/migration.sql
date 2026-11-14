-- Lot 4 du back-office magasin (17/11) : les livraisons.
-- Deux états en plus : « Encaissée » (l'argent est arrivé) et « Retournée » (colis refusé).
-- Chaque mouvement d'argent garde le type de sa commande : l'argent d'une livraison n'entre
-- jamais dans la caisse, et l'historique s'affiche par onglet (Magasin, Livraisons, Réservations).
-- Additif : l'ancienne API continue de fonctionner (elle ne lit pas la nouvelle colonne).

ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'collected';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'returned';

ALTER TABLE "money_movements" ADD COLUMN "order_type" "OrderType";

-- Les mouvements d'avant : leur nature dit leur type (vente au magasin, retrait, livraison).
UPDATE "money_movements"
SET "order_type" = (CASE "kind"
  WHEN 'sale' THEN 'in_store'
  WHEN 'pickup' THEN 'pickup'
  WHEN 'delivery' THEN 'delivery'
END)::"OrderType"
WHERE "kind" <> 'correction';

-- Une correction prend le type de sa commande si elle existe encore, sinon celui de son paiement.
UPDATE "money_movements" m
SET "order_type" = o."type"
FROM "orders" o
WHERE m."order_id" = o."id" AND m."order_type" IS NULL;

UPDATE "money_movements" m
SET "order_type" = p."order_type"
FROM "money_movements" p
WHERE m."order_type" IS NULL
  AND m."order_id" IS NOT NULL
  AND p."order_id" = m."order_id"
  AND p."order_type" IS NOT NULL;
