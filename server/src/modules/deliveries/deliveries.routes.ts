import { Router } from "express";
import { getSummary } from "./deliveries.controller.js";

// Monté sous /admin, déjà protégé.
export const deliveriesAdminRouter = Router();
deliveriesAdminRouter.get("/deliveries/summary", getSummary);
