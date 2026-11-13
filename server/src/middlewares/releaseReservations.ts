import type { NextFunction, Request, Response } from "express";
import { releaseExpiredReservations } from "../modules/orders/reservations.js";

// Libère les retraits expirés avant de répondre (14/11), au plus une fois par minute et par
// processus : la vérification coûte une requête indexée, inutile de la refaire à chaque appel.
// Une erreur est journalisée et n'empêche jamais la requête d'aboutir.
export function releaseReservationsMiddleware({
  minIntervalMs = 60_000,
  release = releaseExpiredReservations,
}: { minIntervalMs?: number; release?: (now: Date) => Promise<number> } = {}) {
  let lastRun = -Infinity;
  return async (_req: Request, _res: Response, next: NextFunction) => {
    const now = new Date();
    if (now.getTime() - lastRun >= minIntervalMs) {
      lastRun = now.getTime();
      try {
        await release(now);
      } catch (error) {
        console.error("[réservations] libération impossible :", error);
      }
    }
    next();
  };
}
