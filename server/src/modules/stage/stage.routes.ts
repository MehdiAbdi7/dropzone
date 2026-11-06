import { Router } from "express";
import type { Request } from "express";
import { uploadImage } from "../../middlewares/upload.js";
import { validate } from "../../middlewares/validate.js";
import { stageParamsSchema } from "./stage.schema.js";
import { removeStagePhoto, setStagePhoto, stagePhotos } from "./stage.service.js";

const params = (req: Request) => [String(req.params.stage), String(req.params.slot)] as const;

// Public : l'accueil lit les photos de ses deux socles.
export const stageRouter = Router();
stageRouter.get("/", async (_req, res) => {
  res.json({ data: await stagePhotos() });
});

// Monté sous /admin, déjà protégé par requireAuth et requireRole("admin").
export const stageAdminRouter = Router();
stageAdminRouter.post("/stage/:stage/:slot/photo", validate({ params: stageParamsSchema }), uploadImage, async (req, res) => {
  res.json({ data: await setStagePhoto(...params(req), req.file) });
});
stageAdminRouter.delete("/stage/:stage/:slot/photo", validate({ params: stageParamsSchema }), async (req, res) => {
  await removeStagePhoto(...params(req));
  res.status(204).end();
});
