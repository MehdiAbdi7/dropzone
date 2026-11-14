-- Frais de retour d'une livraison (17/11) : quand le client refuse le colis ou ne répond pas à la
-- société de livraison, DropZone paie le retour. Le montant se saisit à la main (il dépend de la
-- wilaya et de la société) et s'écrit comme un mouvement négatif du journal, hors caisse.
-- Additif : une seule valeur d'énumération en plus.

ALTER TYPE "MovementKind" ADD VALUE IF NOT EXISTS 'return_fee';
