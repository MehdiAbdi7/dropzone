import type { NextFunction, Request, RequestHandler, Response } from "express";
import { purgeSoldMedia } from "../modules/products/soldMedia.service.js";

// Les suppressions parties après une réponse et pas encore finies. Sert à les attendre (`drainSoldMediaPurges`).
const inFlight = new Set<Promise<unknown>>();

// Attend la fin de toutes les suppressions en cours. Pour les tests : une suppression part APRÈS la réponse, donc elle peut
// tourner encore quand le test suivant vide les tables (TRUNCATE), et les deux se bloquent l'une l'autre (« deadlock
// detected », CI du 26/11). En production, rien n'a besoin de les attendre.
export async function drainSoldMediaPurges(): Promise<void> {
  while (inFlight.size > 0) {
    await Promise.allSettled([...inFlight]);
  }
}

// Après toute écriture réussie du back-office (26/11), supprime les médias des variantes VENDUES (stock à 0, aucune
// commande en cours, voir `purgeSoldMedia`). Un seul point pour tous les chemins de vente payée (comptoir, échange,
// remplacement, retrait récupéré, livraison encaissée, fiche produit) : impossible d'en oublier un. Elle coûte une
// requête et ne tourne jamais pour une simple lecture. Elle part après la réponse et une erreur est journalisée, jamais
// renvoyée au client.
export function purgeSoldMediaMiddleware(purge: () => Promise<number> = purgeSoldMedia): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      res.on("finish", () => {
        if (res.statusCode < 400) {
          const run: Promise<unknown> = purge()
            .catch((error) => console.error("[médias] suppression impossible :", error))
            .finally(() => inFlight.delete(run));
          inFlight.add(run);
        }
      });
    }
    next();
  };
}
