import type { Request, Response } from "express";
import type { PartSearchQuery } from "./part.schema.js";
import { addArrival, correctStock, createPart, listMovements, listParts, updatePart } from "./part.service.js";

// L'auteur d'un mouvement : le compte connecté (la route est derrière requireAuth).
const userId = (res: Response) => res.locals.user!.id;

export async function getParts(_req: Request, res: Response) {
  res.json({ data: await listParts((res.locals.query as PartSearchQuery).q) });
}

export async function postPart(req: Request, res: Response) {
  res.status(201).json({ data: await createPart(req.body, userId(res)) });
}

export async function patchPart(req: Request, res: Response) {
  res.json({ data: await updatePart(Number(req.params.id), req.body) });
}

export async function postArrival(req: Request, res: Response) {
  res.json({ data: await addArrival(Number(req.params.id), req.body, userId(res)) });
}

export async function postCorrection(req: Request, res: Response) {
  res.json({ data: await correctStock(Number(req.params.id), req.body, userId(res)) });
}

export async function getMovements(req: Request, res: Response) {
  res.json({ data: await listMovements(Number(req.params.id)) });
}
