import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { idParamsSchema } from "../../utils/idParams.js";
import { getModels, getScreenSizes, patchModel, postModel, removeModel } from "./model.controller.js";
import { modelBodySchema, modelListQuerySchema, modelPatchSchema } from "./model.schema.js";

// Monté sous /admin, déjà protégé par requireAuth et requireRole("admin").
export const modelAdminRouter = Router();
modelAdminRouter.get("/models", validate({ query: modelListQuerySchema }), getModels);
modelAdminRouter.get("/models/screen-sizes", getScreenSizes);
modelAdminRouter.post("/models", validate({ body: modelBodySchema }), postModel);
modelAdminRouter.patch("/models/:id", validate({ params: idParamsSchema, body: modelPatchSchema }), patchModel);
modelAdminRouter.delete("/models/:id", validate({ params: idParamsSchema }), removeModel);
