import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { idParamsSchema } from "../../utils/idParams.js";
import { getMovements, getParts, patchPart, postArrival, postCorrection, postPart } from "./part.controller.js";
import { arrivalBodySchema, correctionBodySchema, partBodySchema, partPatchSchema, partSearchQuerySchema } from "./part.schema.js";

// Monté sous /admin. Aucune de ces routes n'est dans la table des droits (middlewares/access.ts) : elles sont
// donc pour l'admin seul, jusqu'à ce que le rôle technicien (étape 5) en ouvre une partie.
export const partAdminRouter = Router();

partAdminRouter.get("/parts", validate({ query: partSearchQuerySchema }), getParts);
partAdminRouter.post("/parts", validate({ body: partBodySchema }), postPart);
partAdminRouter.patch("/parts/:id", validate({ params: idParamsSchema, body: partPatchSchema }), patchPart);
partAdminRouter.post("/parts/:id/arrivals", validate({ params: idParamsSchema, body: arrivalBodySchema }), postArrival);
partAdminRouter.post("/parts/:id/corrections", validate({ params: idParamsSchema, body: correctionBodySchema }), postCorrection);
partAdminRouter.get("/parts/:id/movements", validate({ params: idParamsSchema }), getMovements);
