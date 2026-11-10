import { Router } from "express";
import { getDashboard } from "./stats.controller.js";

// Monté sous /admin, déjà protégé par requireAuth et requireRole("admin").
export const statsAdminRouter = Router();

statsAdminRouter.get("/stats", getDashboard);
