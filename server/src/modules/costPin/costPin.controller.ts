import type { Request, Response } from "express";
import { checkCostPin, clearCostPin, isCostPinSet, setCostPin } from "./costPin.service.js";

// Un code est-il réglé ? Tous les rôles du back-office le demandent pour savoir s'il faut cacher les prix d'achat.
export async function getCostPinStatus(_req: Request, res: Response) {
  res.json({ data: { configured: await isCostPinSet() } });
}

export async function postCostPinVerify(req: Request, res: Response) {
  await checkCostPin((req.body as { pin: string }).pin);
  res.json({ data: { ok: true } });
}

export async function putCostPin(req: Request, res: Response) {
  await setCostPin((req.body as { pin: string }).pin);
  res.json({ data: { configured: true } });
}

export async function deleteCostPin(_req: Request, res: Response) {
  await clearCostPin();
  res.json({ data: { configured: false } });
}
