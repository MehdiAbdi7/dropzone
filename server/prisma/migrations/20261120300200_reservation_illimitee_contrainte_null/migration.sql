-- Réservation illimitée (18/11), correction : dans un CHECK, une comparaison avec NULL ne refuse rien. Une
-- commande en retrait sans mode (reservation_mode NULL) et sans créneau passait donc. On compare avec IS NOT
-- DISTINCT FROM : seul le mode « unlimited » dispense de jour, d'heure et de fin de réservation.
ALTER TABLE "orders" DROP CONSTRAINT "orders_pickup_slot_check";
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_pickup_slot_check"
    CHECK (
      "type" <> 'pickup'
      OR "reservation_mode" IS NOT DISTINCT FROM 'unlimited'
      OR ("pickup_date" IS NOT NULL AND "pickup_time" IS NOT NULL AND "reserved_until" IS NOT NULL)
    );
