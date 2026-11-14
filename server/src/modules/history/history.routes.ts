import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { getHistory } from "./history.controller.js";
import { historyQuerySchema } from "./history.schema.js";

// Monté sous /admin, déjà protégé par requireAuth et requireRole("admin"). L'historique (chiffre
// d'affaires, bénéfices) restera réservé à l'admin quand le compte magasin arrivera (lot 7).
export const historyAdminRouter = Router();

historyAdminRouter.get("/history", validate({ query: historyQuerySchema }), getHistory);
