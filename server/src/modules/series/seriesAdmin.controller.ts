import type { Request, Response } from "express";
import {
  catalogBrand,
  catalogCategory,
  catalogOverview,
  catalogSeries,
  createSeries,
  deleteSeries,
  renameSeries,
  setSeriesCover,
  setSeriesModels,
} from "./seriesAdmin.service.js";

const id = (req: Request) => Number(req.params.id);

// Les trois écrans du Catalogue (et la page d'une catégorie).
export async function getCatalog(_req: Request, res: Response) {
  res.json({ data: await catalogOverview() });
}

export async function getCatalogCategory(req: Request, res: Response) {
  res.json({ data: await catalogCategory(id(req)) });
}

export async function getCatalogBrand(req: Request, res: Response) {
  res.json({ data: await catalogBrand(id(req)) });
}

export async function getCatalogSeries(req: Request, res: Response) {
  res.json({ data: await catalogSeries(id(req)) });
}

// La gestion des séries.
export async function postSeries(req: Request, res: Response) {
  res.status(201).json({ data: await createSeries(id(req), req.body.name) });
}

export async function patchSeries(req: Request, res: Response) {
  res.json({ data: await renameSeries(id(req), req.body.name) });
}

export async function postSeriesCover(req: Request, res: Response) {
  res.json({ data: await setSeriesCover(id(req), req.file) });
}

export async function removeSeries(req: Request, res: Response) {
  await deleteSeries(id(req));
  res.status(204).end();
}

export async function putSeriesModels(req: Request, res: Response) {
  await setSeriesModels(id(req), req.body.modelIds);
  res.status(204).end();
}
