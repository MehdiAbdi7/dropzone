import { Router } from "express";
import type { Request } from "express";
import { uploadImage } from "../../middlewares/upload.js";
import { validate } from "../../middlewares/validate.js";
import { colorParamsSchema, modelParamsSchema, unitBodySchema } from "./modelColors.schema.js";
import { addUnit, modelColor, modelColors, removeColorPhoto, setColorPhoto } from "./modelColorsAdmin.service.js";

const id = (req: Request) => Number(req.params.id);
const color = (req: Request) => String(req.params.color);

// Monté sous /admin, déjà protégé par requireAuth et requireRole("admin").
export const modelColorsAdminRouter = Router();

modelColorsAdminRouter.get("/models/:id/colors", validate({ params: modelParamsSchema }), async (req, res) => {
  res.json({ data: await modelColors(id(req)) });
});
modelColorsAdminRouter.get("/models/:id/colors/:color", validate({ params: colorParamsSchema }), async (req, res) => {
  res.json({ data: await modelColor(id(req), color(req)) });
});
modelColorsAdminRouter.post(
  "/models/:id/colors/:color/photo",
  validate({ params: colorParamsSchema }),
  uploadImage,
  async (req, res) => {
    res.json({ data: await setColorPhoto(id(req), color(req), req.file) });
  },
);
modelColorsAdminRouter.delete("/models/:id/colors/:color/photo", validate({ params: colorParamsSchema }), async (req, res) => {
  await removeColorPhoto(id(req), color(req));
  res.status(204).end();
});
modelColorsAdminRouter.post(
  "/models/:id/variants",
  validate({ params: modelParamsSchema, body: unitBodySchema }),
  async (req, res) => {
    res.status(201).json({ data: await addUnit(id(req), req.body) });
  },
);
