import type { Request, Response } from "express";
import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import type { RepairListQuery, WarrantyQuery } from "./repair.schema.js";
import { countRepairs, createRepair, getRepair, listRepairs, updateRepair } from "./repair.service.js";
import { addLine, removeLine, updateLine } from "./repairParts.service.js";
import { changeStatus, deleteRepair } from "./repairStatus.service.js";
import { canMoveTo, createAllowed, patchAllowed, SALES_ONLY } from "./repairAccess.js";
import { findWarranty } from "./warranty.service.js";

// L'auteur d'un geste : le compte connecté (la route est derrière requireAuth).
const userId = (res: Response) => res.locals.user!.id;

export async function getWarranty(_req: Request, res: Response) {
  res.json({ data: await findWarranty(res.locals.query as WarrantyQuery) });
}

export async function postRepair(req: Request, res: Response) {
  // Le technicien crée une fiche sans fixer le prix : ni main-d'œuvre, ni « hors garantie forcé ».
  const keys = Object.entries(req.body as Record<string, unknown>).filter(([, value]) => value !== undefined).map(([key]) => key);
  if (!createAllowed(res.locals.user!.role, keys)) {
    throw new AppError(403, SALES_ONLY);
  }
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
  // Le technicien ne modifie que sa note (la route est la même que celle du vendeur).
  const keys = Object.entries(req.body as Record<string, unknown>).filter(([, value]) => value !== undefined).map(([key]) => key);
  if (!patchAllowed(res.locals.user!.role, keys)) {
    throw new AppError(403, SALES_ONLY);
  }
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
  // Le technicien fait avancer la réparation ; proposer le devis, le refuser et rendre l'appareil sont à la vente.
  const role = res.locals.user!.role;
  const repair = role === "technician" ? await prisma.repair.findUnique({ where: { id: Number(req.params.id) }, select: { underWarranty: true } }) : { underWarranty: false };
  if (!repair) {
    throw new AppError(404, "Fiche de réparation introuvable");
  }
  if (!canMoveTo(role, req.body.status, repair)) {
    throw new AppError(403, SALES_ONLY);
  }
  res.json({ data: await changeStatus(Number(req.params.id), req.body.status, userId(res), req.body.method) });
}

export async function removeRepair(req: Request, res: Response) {
  res.json({ data: await deleteRepair(Number(req.params.id), userId(res)) });
}
