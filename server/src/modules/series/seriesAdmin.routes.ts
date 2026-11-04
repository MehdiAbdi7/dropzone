import { Router } from "express";
import type { Request, Response } from "express";
import { uploadImage } from "../../middlewares/upload.js";
import { validate } from "../../middlewares/validate.js";
import { idParamsSchema, seriesBodySchema, seriesModelsSchema } from "./series.schema.js";
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

// Monté sous /admin, déjà protégé par requireAuth et requireRole("admin").
export const seriesAdminRouter = Router();

// Les trois écrans du Catalogue (et la page d'une catégorie).
seriesAdminRouter.get("/catalog", async (_req: Request, res: Response) => {
  res.json({ data: await catalogOverview() });
});
seriesAdminRouter.get("/catalog/categories/:id", validate({ params: idParamsSchema }), async (req, res) => {
  res.json({ data: await catalogCategory(id(req)) });
});
seriesAdminRouter.get("/catalog/brands/:id", validate({ params: idParamsSchema }), async (req, res) => {
  res.json({ data: await catalogBrand(id(req)) });
});
seriesAdminRouter.get("/catalog/series/:id", validate({ params: idParamsSchema }), async (req, res) => {
  res.json({ data: await catalogSeries(id(req)) });
});

// La gestion des séries.
seriesAdminRouter.post(
  "/brands/:id/series",
  validate({ params: idParamsSchema, body: seriesBodySchema }),
  async (req, res) => {
    res.status(201).json({ data: await createSeries(id(req), req.body.name) });
  },
);
seriesAdminRouter.patch("/series/:id", validate({ params: idParamsSchema, body: seriesBodySchema }), async (req, res) => {
  res.json({ data: await renameSeries(id(req), req.body.name) });
});
seriesAdminRouter.post("/series/:id/cover", validate({ params: idParamsSchema }), uploadImage, async (req, res) => {
  res.json({ data: await setSeriesCover(id(req), req.file) });
});
seriesAdminRouter.delete("/series/:id", validate({ params: idParamsSchema }), async (req, res) => {
  await deleteSeries(id(req));
  res.status(204).end();
});
seriesAdminRouter.put(
  "/series/:id/models",
  validate({ params: idParamsSchema, body: seriesModelsSchema }),
  async (req, res) => {
    await setSeriesModels(id(req), req.body.modelIds);
    res.status(204).end();
  },
);
