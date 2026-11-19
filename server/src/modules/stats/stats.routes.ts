import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middlewares/validate.js";
import { getDashboard, getDashboardOverview } from "./stats.controller.js";

// Monté sous /admin, déjà protégé par requireAuth et requireRole("admin").
export const statsAdminRouter = Router();

statsAdminRouter.get("/stats", getDashboard);

// Les graphiques (20/11) : 7 ou 30 jours, 7 par défaut. Admin seul (route absente de la table des droits).
const overviewQuerySchema = z.object({ days: z.enum(["7", "30"]).default("7").transform(Number) });
statsAdminRouter.get("/stats/overview", validate({ query: overviewQuerySchema }), getDashboardOverview);
