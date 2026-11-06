import { Router } from "express";
import type { Request } from "express";
import { uploadImage } from "../../middlewares/upload.js";
import { validate } from "../../middlewares/validate.js";
import { AppError } from "../../utils/AppError.js";
import { stageLayoutSchema, stageNameSchema, stageParamsSchema, unknownSlots, type StageLayout } from "./stage.schema.js";
import type { StageName } from "./stage.slots.js";
import { removeStagePhoto, setStageLayout, setStagePhoto, stagePhotos } from "./stage.service.js";

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
// La disposition réglée à la souris ou au doigt (06/11) : place, taille et ordre des photos.
stageAdminRouter.put(
  "/stage/:stage/layout",
  validate({ params: stageNameSchema, body: stageLayoutSchema }),
  async (req, res) => {
    const stage = String(req.params.stage) as StageName;
    const layout = req.body as StageLayout;
    if (unknownSlots(stage, layout).length > 0) {
      throw new AppError(400, "Emplacement inconnu pour ce socle");
    }
    await setStageLayout(stage, layout);
    res.status(204).end();
  },
);
