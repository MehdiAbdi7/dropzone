import { Router } from "express";
import { uploadImage } from "../../middlewares/upload.js";
import { validate } from "../../middlewares/validate.js";
import {
  getStage,
  patchStageLabel,
  postStagePhoto,
  putStageLayout,
  removeStagePhotoHandler,
} from "./stage.controller.js";
import { stageLabelSchema, stageLayoutSchema, stageNameSchema, stageParamsSchema } from "./stage.schema.js";

// Public : l'accueil lit les photos de ses deux socles.
export const stageRouter = Router();
stageRouter.get("/", getStage);

// Monté sous /admin, déjà protégé par requireAuth et requireRole("admin").
export const stageAdminRouter = Router();
stageAdminRouter.post("/stage/:stage/:slot/photo", validate({ params: stageParamsSchema }), uploadImage, postStagePhoto);
stageAdminRouter.delete("/stage/:stage/:slot/photo", validate({ params: stageParamsSchema }), removeStagePhotoHandler);
stageAdminRouter.patch(
  "/stage/:stage/:slot/label",
  validate({ params: stageParamsSchema, body: stageLabelSchema }),
  patchStageLabel,
);
stageAdminRouter.put(
  "/stage/:stage/layout",
  validate({ params: stageNameSchema, body: stageLayoutSchema }),
  putStageLayout,
);
