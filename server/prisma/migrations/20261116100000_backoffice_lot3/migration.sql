-- Lot 3 du back-office magasin (16/11) : le prix catalogue d'une ligne et qui a accordé le prix.
-- `unit_price` reste le prix accordé (celui que la caisse et les totaux comptent). Les lignes
-- d'avant n'ont pas de prix catalogue connu : NULL.

ALTER TABLE "order_items"
  ADD COLUMN "list_price" INTEGER,
  ADD COLUMN "granted_by_id" INTEGER,
  ADD CONSTRAINT "order_items_list_price_check" CHECK ("list_price" IS NULL OR "list_price" >= 0);
