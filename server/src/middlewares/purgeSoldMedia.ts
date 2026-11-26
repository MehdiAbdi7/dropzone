import type { NextFunction, Request, RequestHandler, Response } from "express";
import { purgeSoldMedia } from "../modules/products/soldMedia.service.js";

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
          purge().catch((error) => console.error("[médias] suppression impossible :", error));
        }
      });
    }
    next();
  };
}
