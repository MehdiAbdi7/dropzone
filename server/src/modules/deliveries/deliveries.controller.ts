import type { Request, Response } from "express";
import { getDeliverySummary } from "./deliveries.service.js";

export async function getSummary(_req: Request, res: Response) {
  res.json({ data: await getDeliverySummary() });
}
