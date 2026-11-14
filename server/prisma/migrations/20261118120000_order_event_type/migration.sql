-- L'historique par onglet (17/11) : chaque trace de modification ou de suppression garde le type
-- de sa commande (Magasin, Livraisons, Réservations). Les traces d'avant dont la commande existe
-- encore le reçoivent ; celles dont la commande a été supprimée restent à NULL (visibles dans le
-- Total seulement). Additif : l'ancienne API continue de fonctionner.

ALTER TABLE "order_events" ADD COLUMN "order_type" "OrderType";

UPDATE "order_events" e
SET "order_type" = o."type"
FROM "orders" o
WHERE e."order_id" = o."id";

-- Une trace sans commande : le type de l'argent qu'elle a touché, s'il est connu.
UPDATE "order_events" e
SET "order_type" = m."order_type"
FROM (
  SELECT DISTINCT ON ("order_id") "order_id", "order_type"
  FROM "money_movements"
  WHERE "order_id" IS NOT NULL AND "order_type" IS NOT NULL
  ORDER BY "order_id", "id"
) m
WHERE e."order_type" IS NULL AND e."order_id" = m."order_id";
