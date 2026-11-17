-- Réservation illimitée avec avance BaridiMob (18/11). Migration additive : rien ne change pour les commandes
-- existantes (colonnes vides), la réservation de deux jours continue comme avant.
CREATE TYPE "ReservationMode" AS ENUM ('two_days', 'unlimited');

ALTER TABLE "orders"
  ADD COLUMN "reservation_mode" "ReservationMode",
  ADD COLUMN "advance_amount" INTEGER,
  ADD COLUMN "baridi_number" TEXT,
  ADD COLUMN "baridi_shared_at" TIMESTAMP(3),
  ADD COLUMN "advance_paid_at" TIMESTAMP(3);

-- Les retraits déjà passés étaient tous des réservations de deux jours.
UPDATE "orders" SET "reservation_mode" = 'two_days' WHERE "type" = 'pickup';

ALTER TABLE "store_settings"
  ADD COLUMN "reservation_advance" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "baridi_number" TEXT NOT NULL DEFAULT '';
