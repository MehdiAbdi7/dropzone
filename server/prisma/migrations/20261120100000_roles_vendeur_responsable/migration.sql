-- Lot 7 (17/11) : deux rôles pour le personnel du magasin, et un compte qu'on peut désactiver.
-- Migration additive. Les nouvelles valeurs de l'énumération ne sont utilisées par aucune ligne ici :
-- PostgreSQL interdit d'utiliser une valeur ajoutée dans la transaction qui l'ajoute.
ALTER TYPE "Role" ADD VALUE 'seller';
ALTER TYPE "Role" ADD VALUE 'order_manager';

ALTER TABLE "users" ADD COLUMN "disabled" BOOLEAN NOT NULL DEFAULT false;
