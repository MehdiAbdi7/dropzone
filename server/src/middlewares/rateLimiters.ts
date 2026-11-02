import { rateLimit } from "express-rate-limit";
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
