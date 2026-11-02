import { Router } from "express";
import type { Request, Response } from "express";
import { getStats } from "./stats.service.js";

export const statsAdminRouter = Router();

statsAdminRouter.get("/stats", async (_req: Request, res: Response) => {
  res.json({ data: await getStats() });
});
