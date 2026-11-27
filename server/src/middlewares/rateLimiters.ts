import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { env } from "../config/env.js";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

// L'adresse IP vient de `trust proxy` (app.ts), réglé sur le nombre exact de relais.
// Les tests enchaînent des dizaines de requêtes : les limiteurs s'y effacent.
const common = {
  standardHeaders: "draft-8" as const,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  message: { error: { message: "Trop de tentatives, réessayez dans quelques minutes" } },
};

export const loginLimiter = rateLimit({ ...common, windowMs: FIFTEEN_MINUTES, limit: 5 });
export const registerLimiter = rateLimit({ ...common, windowMs: 60 * 60 * 1000, limit: 5 });
export const orderLimiter = rateLimit({ ...common, windowMs: FIFTEEN_MINUTES, limit: 10 });
export const trackLimiter = rateLimit({ ...common, windowMs: FIFTEEN_MINUTES, limit: 20 });
// Changer son email ou son mot de passe redonne le mot de passe actuel : on limite les essais, comme au login.
export const accountLimiter = rateLimit({ ...common, windowMs: FIFTEEN_MINUTES, limit: 10 });
// Le code à 4 chiffres des prix d'achat (27/11) : 10 000 possibilités seulement, donc cinq essais ratés par quart d'heure.
// Compté par utilisateur connecté et non par adresse (tous les employés partagent le wifi du magasin : l'erreur de l'un ne
// doit pas bloquer les autres). Un bon code ne compte pas (`skipSuccessfulRequests`) : seul un essai raté use la limite.
export const costPinLimiter = rateLimit({
  ...common,
  windowMs: FIFTEEN_MINUTES,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req, res) => `user:${res.locals.user?.id ?? ipKeyGenerator(req.ip ?? "")}`,
});
