-- Lot 7 (revue de sécurité) : un numéro de version de session par compte. Le jeton de connexion le porte ;
-- le monter coupe d'un coup toutes les sessions déjà ouvertes de ce compte (mot de passe réinitialisé,
-- compte désactivé). Les jetons émis avant cette migration n'ont pas de numéro : ils valent 0, comme la
-- colonne, et restent valables jusqu'à la première révocation. Migration additive.
ALTER TABLE "users" ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;
