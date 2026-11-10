import { Router } from "express";
import { uploadImage } from "../../middlewares/upload.js";
import { validate } from "../../middlewares/validate.js";
import { idParamsSchema } from "../../utils/idParams.js";
import {
  getModelColor,
  getModelColors,
  postColorPhoto,
  postUnit,
  removeColorPhotoHandler,
} from "./modelColorsAdmin.controller.js";
import { colorParamsSchema, unitBodySchema } from "./modelColors.schema.js";

// Monté sous /admin, déjà protégé par requireAuth et requireRole("admin").
export const modelColorsAdminRouter = Router();

modelColorsAdminRouter.get("/models/:id/colors", validate({ params: idParamsSchema }), getModelColors);
modelColorsAdminRouter.get("/models/:id/colors/:color", validate({ params: colorParamsSchema }), getModelColor);
modelColorsAdminRouter.post(
  "/models/:id/colors/:color/photo",
  validate({ params: colorParamsSchema }),
  uploadImage,
  postColorPhoto,
);
modelColorsAdminRouter.delete(
  "/models/:id/colors/:color/photo",
  validate({ params: colorParamsSchema }),
  removeColorPhotoHandler,
);
modelColorsAdminRouter.post(
  "/models/:id/variants",
  validate({ params: idParamsSchema, body: unitBodySchema }),
  postUnit,
);
