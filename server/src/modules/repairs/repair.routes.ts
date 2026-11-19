import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { idParamsSchema } from "../../utils/idParams.js";
import {
  deleteRepairLine,
  getOneRepair,
  getRepairCounts,
  getRepairs,
  getWarranty,
  patchRepair,
  patchRepairLine,
  postRepair,
  postRepairLine,
  postRepairReplace,
  postRepairStatus,
  removeRepair,
} from "./repair.controller.js";
import {
  repairBodySchema,
  repairLineBodySchema,
  repairLineParamsSchema,
  repairLinePatchSchema,
  repairListQuerySchema,
  repairPatchSchema,
  repairStatusBodySchema,
  replaceBodySchema,
  warrantyQuerySchema,
} from "./repair.schema.js";

// Monté sous /admin. La table des droits (middlewares/access.ts) ouvre une partie de ces routes au technicien, au
// vendeur et au responsable commande ; supprimer une fiche n'y figure pas : admin seul.
// `/repairs/warranty` et `/repairs/counts` passent AVANT `/repairs/:id`, sinon « warranty » serait pris pour un numéro.
export const repairAdminRouter = Router();

repairAdminRouter.get("/repairs/warranty", validate({ query: warrantyQuerySchema }), getWarranty);
repairAdminRouter.get("/repairs/counts", getRepairCounts);
repairAdminRouter.get("/repairs", validate({ query: repairListQuerySchema }), getRepairs);
repairAdminRouter.post("/repairs", validate({ body: repairBodySchema }), postRepair);
repairAdminRouter.get("/repairs/:id", validate({ params: idParamsSchema }), getOneRepair);
repairAdminRouter.patch("/repairs/:id", validate({ params: idParamsSchema, body: repairPatchSchema }), patchRepair);
repairAdminRouter.delete("/repairs/:id", validate({ params: idParamsSchema }), removeRepair);
repairAdminRouter.post("/repairs/:id/status", validate({ params: idParamsSchema, body: repairStatusBodySchema }), postRepairStatus);
repairAdminRouter.post("/repairs/:id/replace", validate({ params: idParamsSchema, body: replaceBodySchema }), postRepairReplace);
repairAdminRouter.post("/repairs/:id/parts",validate({ params: idParamsSchema, body: repairLineBodySchema }), postRepairLine);
repairAdminRouter.patch("/repairs/:id/parts/:lineId", validate({ params: repairLineParamsSchema, body: repairLinePatchSchema }), patchRepairLine);
repairAdminRouter.delete("/repairs/:id/parts/:lineId", validate({ params: repairLineParamsSchema }), deleteRepairLine);
