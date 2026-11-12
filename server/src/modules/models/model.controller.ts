import type { Request, Response } from "express";
import type { ModelBody, ModelListQuery, ModelPatch } from "./model.schema.js";
import { createModel, deleteModel, listModels, listScreenSizes, updateModel } from "./model.service.js";

export async function getModels(_req: Request, res: Response) {
  res.json({ data: await listModels(res.locals.query as ModelListQuery) });
}

export async function postModel(req: Request, res: Response) {
  res.status(201).json({ data: await createModel(req.body as ModelBody) });
}

export async function patchModel(req: Request, res: Response) {
  res.json({ data: await updateModel(Number(req.params.id), req.body as ModelPatch) });
}

export async function removeModel(req: Request, res: Response) {
  await deleteModel(Number(req.params.id));
  res.status(204).end();
}

export async function getScreenSizes(_req: Request, res: Response) {
  res.json({ data: await listScreenSizes() });
}
