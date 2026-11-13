import type { Request, Response } from "express";
import { getStoreHours, setStoreHours } from "./store.service.js";

// Public : le formulaire de commande en a besoin pour proposer les créneaux de retrait.
export async function getHours(_req: Request, res: Response) {
  res.json({ data: await getStoreHours() });
}

export async function putHours(req: Request, res: Response) {
  res.json({ data: await setStoreHours(req.body) });
}
