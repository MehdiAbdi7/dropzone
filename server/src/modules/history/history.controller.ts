import type { Request, Response } from "express";
import type { HistoryQuery } from "./history.schema.js";
import { getHistory as readHistory } from "./history.service.js";

export async function getHistory(_req: Request, res: Response) {
  res.json({ data: await readHistory(res.locals.query as HistoryQuery) });
}
