import type { Request, Response } from "express";
import type { z } from "zod";
import type { tradeInListQuerySchema } from "./exchange.schema.js";
import { createExchange, listTradeIns, publishTradeIn, updateTradeIn } from "./exchange.service.js";

export async function postExchange(req: Request, res: Response) {
  res.status(201).json({ data: await createExchange(req.body, res.locals.user!.id) });
}

export async function getTradeIns(_req: Request, res: Response) {
  const { status } = res.locals.query as z.infer<typeof tradeInListQuerySchema>;
  res.json({ data: await listTradeIns(status) });
}

export async function postPublishTradeIn(req: Request, res: Response) {
  res.status(201).json({ data: await publishTradeIn(Number(req.params.id), req.body.price) });
}

export async function patchTradeIn(req: Request, res: Response) {
  res.json({ data: await updateTradeIn(Number(req.params.id), req.body) });
}
