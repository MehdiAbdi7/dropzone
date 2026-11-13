import type { Request, Response } from "express";
import { closeCashDay, getTodayCash, openCashDay } from "./cash.service.js";

export async function getToday(_req: Request, res: Response) {
  res.json({ data: await getTodayCash() });
}

export async function postOpen(req: Request, res: Response) {
  res.status(201).json({ data: await openCashDay(req.body.openingFloat, res.locals.user!.id) });
}

export async function postClose(req: Request, res: Response) {
  res.json({ data: await closeCashDay(req.body.countedCash, res.locals.user!.id) });
}
