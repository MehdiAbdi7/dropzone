-- Lot 6 du back-office magasin (15/11) : la facture.
-- Les réglages qui s'impriment (une seule ligne), la suite continue des numéros de facture (une ligne par
-- année), et le numéro de facture d'une commande, attribué à la première ouverture et jamais modifié.
-- Additif : l'ancienne API continue de fonctionner (elle ne lit pas les nouvelles colonnes).

ALTER TABLE "orders"
  ADD COLUMN "invoice_number" INTEGER,
  ADD COLUMN "invoice_year" INTEGER,
  ADD COLUMN "invoice_issued_at" TIMESTAMP(3);

-- Deux commandes n'ont jamais le même numéro la même année (NULL, NULL se répète sans conflit).
CREATE UNIQUE INDEX "orders_invoice_year_invoice_number_key" ON "orders"("invoice_year", "invoice_number");

-- Le numéro et l'année vont ensemble : jamais l'un sans l'autre.
ALTER TABLE "orders" ADD CONSTRAINT "orders_invoice_check"
  CHECK (("invoice_number" IS NULL) = ("invoice_year" IS NULL) AND ("invoice_number" IS NULL) = ("invoice_issued_at" IS NULL));

CREATE TABLE "invoice_settings" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "shop_name" TEXT NOT NULL DEFAULT 'DropZone',
  "legal_form" TEXT NOT NULL DEFAULT '',
  "address" TEXT NOT NULL DEFAULT '',
  "phones" TEXT NOT NULL DEFAULT '',
  "email" TEXT NOT NULL DEFAULT '',
  "instagram" TEXT NOT NULL DEFAULT '',
  "register_number" TEXT NOT NULL DEFAULT '',
  "nif" TEXT NOT NULL DEFAULT '',
  "nis" TEXT NOT NULL DEFAULT '',
  "tax_article" TEXT NOT NULL DEFAULT '',
  "rib" TEXT NOT NULL DEFAULT '',
  "warranty_terms" TEXT NOT NULL DEFAULT '',
  "footer_note" TEXT NOT NULL DEFAULT '',
  "vat_enabled" BOOLEAN NOT NULL DEFAULT false,
  "vat_rate" INTEGER NOT NULL DEFAULT 19,
  CONSTRAINT "invoice_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "invoice_settings_single_row_check" CHECK ("id" = 1),
  CONSTRAINT "invoice_settings_vat_rate_check" CHECK ("vat_rate" BETWEEN 0 AND 100)
);

CREATE TABLE "invoice_counters" (
  "year" INTEGER NOT NULL,
  "value" INTEGER NOT NULL,
  CONSTRAINT "invoice_counters_pkey" PRIMARY KEY ("year")
);

-- La ligne unique des réglages, comme `store_settings` : créée ici, jamais supprimée.
INSERT INTO "invoice_settings" ("id") VALUES (1);
