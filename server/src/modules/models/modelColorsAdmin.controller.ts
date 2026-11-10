import type { Request, Response } from "express";
import type { UnitBody } from "./modelColors.schema.js";
import { addUnit, modelColor, modelColors, removeColorPhoto, setColorPhoto } from "./modelColorsAdmin.service.js";

const id = (req: Request) => Number(req.params.id);
const color = (req: Request) => String(req.params.color);

export async function getModelColors(req: Request, res: Response) {
  res.json({ data: await modelColors(id(req)) });
}

export async function getModelColor(req: Request, res: Response) {
  res.json({ data: await modelColor(id(req), color(req)) });
}

export async function postColorPhoto(req: Request, res: Response) {
  res.json({ data: await setColorPhoto(id(req), color(req), req.file) });
}

export async function removeColorPhotoHandler(req: Request, res: Response) {
  await removeColorPhoto(id(req), color(req));
  res.status(204).end();
}

export async function postUnit(req: Request, res: Response) {
  res.status(201).json({ data: await addUnit(id(req), req.body as UnitBody) });
}
