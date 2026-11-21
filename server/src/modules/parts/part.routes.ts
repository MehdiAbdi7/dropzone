import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { idParamsSchema } from "../../utils/idParams.js";
import {
  deletePartCategory,
  getMovements,
  getPartCategories,
  getParts,
  patchPart,
  patchPartCategory,
  postArrival,
  postCorrection,
  postPart,
  postPartCategory,
} from "./part.controller.js";
import {
  arrivalBodySchema,
  correctionBodySchema,
  partBodySchema,
  partCategoryBodySchema,
  partPatchSchema,
  partSearchQuerySchema,
} from "./part.schema.js";

// Monté sous /admin. La table des droits (middlewares/access.ts) ouvre au technicien la liste, la création, les
// arrivages et le journal (le vendeur et le responsable lisent la liste) ; modifier une pièce et corriger un stock
// n'y figurent pas : admin seul.
export const partAdminRouter = Router();

// Les catégories (21/11) : la liste est lue par les rôles qui lisent les pièces ; créer, renommer et supprimer
// n'ont pas de règle dans la table des droits : admin seul.
partAdminRouter.get("/part-categories", getPartCategories);
partAdminRouter.post("/part-categories", validate({ body: partCategoryBodySchema }), postPartCategory);
partAdminRouter.patch("/part-categories/:id", validate({ params: idParamsSchema, body: partCategoryBodySchema }), patchPartCategory);
partAdminRouter.delete("/part-categories/:id", validate({ params: idParamsSchema }), deletePartCategory);

partAdminRouter.get("/parts", validate({ query: partSearchQuerySchema }), getParts);
partAdminRouter.post("/parts", validate({ body: partBodySchema }), postPart);
partAdminRouter.patch("/parts/:id", validate({ params: idParamsSchema, body: partPatchSchema }), patchPart);
partAdminRouter.post("/parts/:id/arrivals", validate({ params: idParamsSchema, body: arrivalBodySchema }), postArrival);
partAdminRouter.post("/parts/:id/corrections", validate({ params: idParamsSchema, body: correctionBodySchema }), postCorrection);
partAdminRouter.get("/parts/:id/movements", validate({ params: idParamsSchema }), getMovements);
