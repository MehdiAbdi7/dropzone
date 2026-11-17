-- Réservation illimitée (18/11), suite : une réservation illimitée n'a ni jour, ni heure, ni fin de réservation
-- (elle ne s'expire jamais). La règle « un retrait a son créneau » ne vaut donc plus que pour la réservation de
-- deux jours ; une réservation illimitée a, elle, toujours son avance.
ALTER TABLE "orders" DROP CONSTRAINT "orders_pickup_slot_check";
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_pickup_slot_check"
    CHECK (
      "type" <> 'pickup'
      OR "reservation_mode" = 'unlimited'
      OR ("pickup_date" IS NOT NULL AND "pickup_time" IS NOT NULL AND "reserved_until" IS NOT NULL)
    ),
  ADD CONSTRAINT "orders_unlimited_advance_check"
    CHECK ("reservation_mode" IS DISTINCT FROM 'unlimited' OR "advance_amount" IS NOT NULL);
