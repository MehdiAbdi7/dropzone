import type { Request, Response } from "express";
import type { SeriesListQuery } from "./series.schema.js";
import { getSeries, listSeries, listSeriesByBrand } from "./series.service.js";

// Les affiches de la Boutique : la liste des séries d'une marque, puis une série.
export async function getSeriesList(_req: Request, res: Response) {
  const { category, brand } = res.locals.query as SeriesListQuery;
  res.json({ data: brand ? await listSeries(category, brand) : await listSeriesByBrand(category) });
}

export async function getOneSeries(req: Request, res: Response) {
  const { category, brand, serie } = req.params as Record<string, string>;
  res.json({ data: await getSeries(category, brand, serie) });
}
