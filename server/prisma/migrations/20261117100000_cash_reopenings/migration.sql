-- Rouvrir la caisse du jour (15/11) : la trace de chaque réouverture, avec le comptage effacé.
-- Table nouvelle, rien d'existant n'est modifié : l'ancienne API continue de fonctionner.

CREATE TABLE "cash_reopenings" (
  "id" SERIAL NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "business_date" DATE NOT NULL,
  "user_id" INTEGER,
  "previous_counted_cash" INTEGER,
  "previous_closed_at" TIMESTAMP(3),

  CONSTRAINT "cash_reopenings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cash_reopenings_business_date_idx" ON "cash_reopenings"("business_date");
