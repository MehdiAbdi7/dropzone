import type { Request, Response } from "express";
import { getOverview, type OverviewDays } from "./overview.service.js";
import { getStats } from "./stats.service.js";

export async function getDashboard(_req: Request, res: Response) {
  res.json({ data: await getStats() });
}

// Les graphiques du tableau de bord (20/11) : `days` est déjà validé (7 ou 30).
export async function getDashboardOverview(_req: Request, res: Response) {
  const { days } = res.locals.query as { days: OverviewDays };
  res.json({ data: await getOverview(days) });
}
