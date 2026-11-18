import type { Request, Response } from "express";
import type { RepairListQuery, WarrantyQuery } from "./repair.schema.js";
import { countRepairs, createRepair, getRepair, listRepairs, updateRepair } from "./repair.service.js";
import { findWarranty } from "./warranty.service.js";

// L'auteur d'un geste : le compte connecté (la route est derrière requireAuth).
const userId = (res: Response) => res.locals.user!.id;

export async function getWarranty(_req: Request, res: Response) {
  res.json({ data: await findWarranty(res.locals.query as WarrantyQuery) });
}

export async function postRepair(req: Request, res: Response) {
  res.status(201).json({ data: await createRepair(req.body, userId(res)) });
}

export async function getRepairs(_req: Request, res: Response) {
  res.json({ data: await listRepairs(res.locals.query as RepairListQuery) });
}

export async function getRepairCounts(_req: Request, res: Response) {
  res.json({ data: await countRepairs() });
}

export async function getOneRepair(req: Request, res: Response) {
  res.json({ data: await getRepair(Number(req.params.id)) });
}

export async function patchRepair(req: Request, res: Response) {
  res.json({ data: await updateRepair(Number(req.params.id), req.body) });
}
