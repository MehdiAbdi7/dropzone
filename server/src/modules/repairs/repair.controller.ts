import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError.js";
import type { RepairListQuery, WarrantyQuery } from "./repair.schema.js";
import { countRepairs, createRepair, getRepair, listRepairs, updateRepair } from "./repair.service.js";
import { addLine, removeLine, updateLine } from "./repairParts.service.js";
import { replaceRepair } from "./repairReplace.service.js";
import { changeStatus, deleteRepair } from "./repairStatus.service.js";
import { canMoveTo, createAllowed, patchAllowed, SALES_ONLY } from "./repairAccess.js";
import { findWarranty } from "./warranty.service.js";

// L'auteur d'un geste : le compte connecté (la route est derrière requireAuth).
const userId = (res: Response) => res.locals.user!.id;

export async function getWarranty(_req: Request, res: Response) {
  res.json({ data: await findWarranty(res.locals.query as WarrantyQuery) });
}

export async function postRepair(req: Request, res: Response) {
  if (!createAllowed(res.locals.user!.role)) {
    throw new AppError(403, SALES_ONLY);
  }
  res.status(201).json({ data: forRole(await createRepair(req.body, userId(res)), res) });
}

export async function getRepairs(_req: Request, res: Response) {
  res.json({ data: await listRepairs(res.locals.query as RepairListQuery) });
}

export async function getRepairCounts(_req: Request, res: Response) {
  res.json({ data: await countRepairs() });
}

// Ce que le technicien ne reçoit pas d'une fiche, même s'il voit tout son travail : le prix que le client a payé son
// appareil à la vente (`origin.unitPrice`, qui ne sert qu'au remplacement, un geste de la vente), et, pour une fiche
// remplacée (étape 6), `partsCost`, qui est alors le prix d'achat de l'appareil donné et non celui d'une pièce.
function forRole<T extends { replacementOrderNumber: number | null; partsCost: number | null; origin: { unitPrice?: number } | null }>(detail: T, res: Response): T {
  if (res.locals.user!.role !== "technician") return detail;
  const { partsCost, origin, ...rest } = detail;
  const visibleOrigin = origin ? { ...origin } : origin;
  if (visibleOrigin) delete visibleOrigin.unitPrice;
  return { ...rest, origin: visibleOrigin, ...(detail.replacementOrderNumber === null ? { partsCost } : {}) } as T;
}

export async function getOneRepair(req: Request, res: Response) {
  res.json({ data: forRole(await getRepair(Number(req.params.id)), res) });
}

export async function patchRepair(req: Request, res: Response) {
  if (!patchAllowed(res.locals.user!.role)) {
    throw new AppError(403, SALES_ONLY);
  }
  res.json({ data: forRole(await updateRepair(Number(req.params.id), req.body, userId(res)), res) });
}

export async function postRepairLine(req: Request, res: Response) {
  res.json({ data: forRole(await addLine(Number(req.params.id), req.body, userId(res)), res) });
}

export async function patchRepairLine(req: Request, res: Response) {
  res.json({ data: forRole(await updateLine(Number(req.params.id), Number(req.params.lineId), req.body.quantity, userId(res)), res) });
}

export async function deleteRepairLine(req: Request, res: Response) {
  res.json({ data: forRole(await removeLine(Number(req.params.id), Number(req.params.lineId), userId(res)), res) });
}

export async function postRepairStatus(req: Request, res: Response) {
  // Le technicien fait tous les passages sauf rendre l'appareil (il encaisse : geste de la vente).
  if (!canMoveTo(res.locals.user!.role, req.body.status)) {
    throw new AppError(403, SALES_ONLY);
  }
  res.json({ data: forRole(await changeStatus(Number(req.params.id), req.body.status, userId(res), req.body.method), res) });
}

export async function postRepairReplace(req: Request, res: Response) {
  res.status(201).json({ data: await replaceRepair(Number(req.params.id), req.body, userId(res)) });
}

export async function removeRepair(req: Request, res: Response) {
  res.json({ data: await deleteRepair(Number(req.params.id), userId(res)) });
}
