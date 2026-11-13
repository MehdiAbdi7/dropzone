-- Reprise des commandes d'avant le lot 1 (14/11) : toutes sont des livraisons, numérotées dans
-- leur journée d'Alger (UTC+1 toute l'année, created_at est rangé en UTC), dans l'ordre de passage.
UPDATE "orders" AS o
SET "type" = 'delivery', "daily_number" = r.n, "business_date" = r.d
FROM (
  SELECT "id",
         ("created_at" + interval '1 hour')::date AS d,
         row_number() OVER (PARTITION BY ("created_at" + interval '1 hour')::date ORDER BY "created_at", "id") AS n
  FROM "orders"
) AS r
WHERE o."id" = r."id";

-- Les compteurs repartent après le dernier numéro de chaque journée reprise.
INSERT INTO "daily_counters" ("date", "value")
SELECT "business_date", max("daily_number") FROM "orders" GROUP BY "business_date"
ON CONFLICT ("date") DO UPDATE SET "value" = EXCLUDED."value";
