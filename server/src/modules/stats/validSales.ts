import { Prisma } from "../../generated/prisma/client.js";

// Ce qui compte comme une VENTE, écrit une seule fois pour l'accueil (getStats) et ses graphiques (getOverview) :
// la même règle, donc les mêmes chiffres partout. Une ligne par commande : son id, son type, son total et sa date de
// vente. `Prisma.sql` : un morceau de SQL qui s'insère dans un `$queryRaw` sans rien coller dans le texte.
//
// La date d'une vente (lot 2, 15/11) : le jour où l'argent est arrivé (au comptoir pour un retrait ou une vente au
// magasin, à l'encaissement pour une livraison, lot 4).
export const validSales = Prisma.sql`
  SELECT o.id,
         o.type::text AS type,
         o.total,
         COALESCE(
           (SELECT MIN(m.business_date) FROM money_movements m
             WHERE m.order_id = o.id AND m.kind IN ('sale', 'pickup', 'delivery', 'exchange')),
           o.business_date) AS sale_date
  FROM orders o
  -- Une réservation n'est pas une vente tant que le client n'est pas venu payer (14/11) ; une
  -- livraison non plus tant que son argent n'est pas arrivé (lot 4) ; un colis retourné jamais.
  WHERE o.status NOT IN ('cancelled', 'reserved', 'expired', 'returned')
    AND (o.type <> 'delivery' OR o.status = 'collected')
    -- Le remplacement d'un appareil sous garantie n'est pas une vente (atelier, étape 6).
    AND NOT EXISTS (SELECT 1 FROM repairs r WHERE r.replacement_order_id = o.id)
`;
