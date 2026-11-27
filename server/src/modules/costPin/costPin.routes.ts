import { Router } from "express";
import { costPinLimiter } from "../../middlewares/rateLimiters.js";
import { validate } from "../../middlewares/validate.js";
import { deleteCostPin, getCostPinStatus, postCostPinVerify, putCostPin } from "./costPin.controller.js";
import { costPinBodySchema } from "./costPin.schema.js";

// Monté sous /admin, déjà protégé. Savoir si un code existe et le taper : tous les rôles du back-office (table des droits,
// middlewares/access.ts). Le régler et le retirer : l'admin seul, la table ne les ouvre à personne d'autre.
export const costPinAdminRouter = Router();
costPinAdminRouter.get("/cost-pin", getCostPinStatus);
costPinAdminRouter.post("/cost-pin/verify", costPinLimiter, validate({ body: costPinBodySchema }), postCostPinVerify);
costPinAdminRouter.put("/cost-pin", validate({ body: costPinBodySchema }), putCostPin);
costPinAdminRouter.delete("/cost-pin", deleteCostPin);
