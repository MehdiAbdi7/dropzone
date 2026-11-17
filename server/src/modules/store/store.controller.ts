import type { Request, Response } from "express";
import { getReservationSettings, getStoreHours, getUnlimitedAdvance, setReservationSettings, setStoreHours } from "./store.service.js";

// Public : le formulaire de commande en a besoin pour proposer les créneaux de retrait.
export async function getHours(_req: Request, res: Response) {
  res.json({ data: await getStoreHours() });
}

export async function putHours(req: Request, res: Response) {
  res.json({ data: await setStoreHours(req.body) });
}

// Public : le formulaire de commande propose la réservation illimitée si l'avance est réglée.
export async function getPublicReservation(_req: Request, res: Response) {
  res.json({ data: { unlimitedAdvance: await getUnlimitedAdvance() } });
}

export async function getAdminReservation(_req: Request, res: Response) {
  res.json({ data: await getReservationSettings() });
}

export async function putAdminReservation(req: Request, res: Response) {
  res.json({ data: await setReservationSettings(req.body) });
}
