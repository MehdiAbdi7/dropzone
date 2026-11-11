import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError.js";
import { unknownSlots, type StageLayout } from "./stage.schema.js";
import { removeStagePhoto, setStageLayout, setStagePhoto, stagePhotos, updateStageLabel } from "./stage.service.js";

const params = (req: Request) => [String(req.params.stage), String(req.params.slot)] as const;

// Public : l'accueil lit les photos de ses deux socles.
export async function getStage(_req: Request, res: Response) {
  res.json({ data: await stagePhotos() });
}

export async function postStagePhoto(req: Request, res: Response) {
  res.json({ data: await setStagePhoto(...params(req), req.file) });
}

export async function removeStagePhotoHandler(req: Request, res: Response) {
  await removeStagePhoto(...params(req));
  res.status(204).end();
}

export async function patchStageLabel(req: Request, res: Response) {
  const [stage, slot] = params(req);
  await updateStageLabel(stage, slot, req.body.label);
  res.status(204).end();
}

// La disposition réglée à la souris ou au doigt (06/11) : place, taille et ordre des photos.
export async function putStageLayout(req: Request, res: Response) {
  const stage = String(req.params.stage);
  const layout = req.body as StageLayout;
  if (unknownSlots(stage, layout).length > 0) {
    throw new AppError(400, "Emplacement inconnu pour ce socle");
  }
  await setStageLayout(stage, layout);
  res.status(204).end();
}
