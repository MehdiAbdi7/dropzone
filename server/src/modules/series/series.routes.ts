import { Router } from "express";
import type { Request, Response } from "express";
import { validate } from "../../middlewares/validate.js";
import { seriesListQuerySchema, seriesParamsSchema, type SeriesListQuery } from "./series.schema.js";
import { getSeries, listSeries } from "./series.service.js";

// Les affiches de la Boutique : la liste des séries d'une marque, puis une série.
async function getSeriesList(_req: Request, res: Response) {
  const { category, brand } = res.locals.query as SeriesListQuery;
  res.json({ data: await listSeries(category, brand) });
}

async function getOneSeries(req: Request, res: Response) {
  const { category, brand, serie } = req.params as Record<string, string>;
  res.json({ data: await getSeries(category, brand, serie) });
}

export const seriesRouter = Router();
seriesRouter.get("/", validate({ query: seriesListQuerySchema }), getSeriesList);
seriesRouter.get("/:category/:brand/:serie", validate({ params: seriesParamsSchema }), getOneSeries);
