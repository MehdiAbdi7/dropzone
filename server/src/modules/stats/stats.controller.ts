import type { Request, Response } from "express";
import { getStats } from "./stats.service.js";

export async function getDashboard(_req: Request, res: Response) {
  res.json({ data: await getStats() });
}
