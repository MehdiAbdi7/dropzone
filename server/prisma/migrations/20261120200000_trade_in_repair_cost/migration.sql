-- Reprises (18/11) : les frais de remise en état d'une reprise avant sa mise en vente (batterie neuve, écran…).
-- Ils s'ajoutent au prix de reprise pour former le prix d'achat de l'affaire. Migration additive : 0 pour
-- les reprises existantes, donc rien ne change pour elles.
ALTER TABLE "trade_ins" ADD COLUMN "repair_cost" INTEGER NOT NULL DEFAULT 0;
