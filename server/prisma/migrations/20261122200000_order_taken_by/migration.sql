-- La commande prise par téléphone (19/11) : l'employé qui l'a saisie au back-office. NULL = commande du site.
-- Additive : aucune ligne existante ne change. Si le compte de l'employé est supprimé, la commande reste (SET NULL).
ALTER TABLE "orders" ADD COLUMN "taken_by_id" INTEGER;
ALTER TABLE "orders" ADD CONSTRAINT "orders_taken_by_id_fkey" FOREIGN KEY ("taken_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
