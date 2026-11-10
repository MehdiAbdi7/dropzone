import type { Request, Response } from "express";
import type { ChoiceBody, ChoiceListBody, ChoiceListPatch, ChoicePatch } from "./choice.schema.js";
import {
  colorPalette,
  createChoice,
  createChoiceList,
  deleteChoice,
  deleteChoiceList,
  listChoices,
  updateChoice,
  updateChoiceList,
} from "./choice.service.js";

export async function getChoices(_req: Request, res: Response) {
  res.json({ data: await listChoices() });
}

export async function getColors(_req: Request, res: Response) {
  res.json({ data: await colorPalette() });
}

export async function postChoice(req: Request, res: Response) {
  res.status(201).json({ data: await createChoice(req.body as ChoiceBody) });
}

export async function patchChoice(req: Request, res: Response) {
  res.json({ data: await updateChoice(Number(req.params.id), req.body as ChoicePatch) });
}

export async function removeChoice(req: Request, res: Response) {
  await deleteChoice(Number(req.params.id));
  res.status(204).end();
}

export async function postChoiceList(req: Request, res: Response) {
  res.status(201).json({ data: await createChoiceList(req.body as ChoiceListBody) });
}

export async function patchChoiceList(req: Request, res: Response) {
  res.json({ data: await updateChoiceList(Number(req.params.id), req.body as ChoiceListPatch) });
}

export async function removeChoiceList(req: Request, res: Response) {
  await deleteChoiceList(Number(req.params.id));
  res.status(204).end();
}
