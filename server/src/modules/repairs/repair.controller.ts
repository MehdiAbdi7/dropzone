import type { Request, Response } from "express";
import type { RepairListQuery, WarrantyQuery } from "./repair.schema.js";
import { countRepairs, createRepair, getRepair, listRepairs, updateRepair } from "./repair.service.js";
import { addLine, removeLine, updateLine } from "./repairParts.service.js";
import { changeStatus, deleteRepair } from "./repairStatus.service.js";
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
  res.json({ data: await updateRepair(Number(req.params.id), req.body, userId(res)) });
}

export async function postRepairLine(req: Request, res: Response) {
  res.json({ data: await addLine(Number(req.params.id), req.body, userId(res)) });
}

export async function patchRepairLine(req: Request, res: Response) {
  res.json({ data: await updateLine(Number(req.params.id), Number(req.params.lineId), req.body.quantity, userId(res)) });
}

export async function deleteRepairLine(req: Request, res: Response) {
  res.json({ data: await removeLine(Number(req.params.id), Number(req.params.lineId), userId(res)) });
}

export async function postRepairStatus(req: Request, res: Response) {
  res.json({ data: await changeStatus(Number(req.params.id), req.body.status, userId(res)) });
}

export async function removeRepair(req: Request, res: Response) {
  res.json({ data: await deleteRepair(Number(req.params.id), userId(res)) });
}
