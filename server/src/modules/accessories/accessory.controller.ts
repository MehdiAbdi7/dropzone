import type { Request, Response } from "express";
import { createMaker, deleteMaker, listAdminMakers, setMakerLogo, updateMaker } from "./accessoryMaker.service.js";
import { getAccessoryCatalog } from "./accessoryCatalog.service.js";

export async function getCatalog(req: Request, res: Response) {
  res.json({ data: await getAccessoryCatalog(String(req.params.category)) });
}

export async function getMakers(_req: Request, res: Response) {
  res.json({ data: await listAdminMakers() });
}

export async function postMaker(req: Request, res: Response) {
  res.status(201).json({ data: await createMaker(Number(req.params.id), req.body) });
}

export async function patchMaker(req: Request, res: Response) {
  res.json({ data: await updateMaker(Number(req.params.id), req.body) });
}

export async function postMakerLogo(req: Request, res: Response) {
  res.json({ data: await setMakerLogo(Number(req.params.id), req.file) });
}

export async function removeMaker(req: Request, res: Response) {
  await deleteMaker(Number(req.params.id));
  res.status(204).end();
}
