import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { idParamsSchema } from "../../utils/idParams.js";
import { getOneRepair, getRepairCounts, getRepairs, getWarranty, patchRepair, postRepair } from "./repair.controller.js";
import { repairBodySchema, repairListQuerySchema, repairPatchSchema, warrantyQuerySchema } from "./repair.schema.js";

// Monté sous /admin. Aucune de ces routes n'est dans la table des droits (middlewares/access.ts) : elles sont
// donc pour l'admin seul, jusqu'à ce que les rôles technicien et vendeur (étape 5) en ouvrent une partie.
// `/repairs/warranty` et `/repairs/counts` passent AVANT `/repairs/:id`, sinon « warranty » serait pris pour un numéro.
export const repairAdminRouter = Router();

repairAdminRouter.get("/repairs/warranty", validate({ query: warrantyQuerySchema }), getWarranty);
repairAdminRouter.get("/repairs/counts", getRepairCounts);
repairAdminRouter.get("/repairs", validate({ query: repairListQuerySchema }), getRepairs);
repairAdminRouter.post("/repairs", validate({ body: repairBodySchema }), postRepair);
repairAdminRouter.get("/repairs/:id", validate({ params: idParamsSchema }), getOneRepair);
repairAdminRouter.patch("/repairs/:id", validate({ params: idParamsSchema, body: repairPatchSchema }), patchRepair);
