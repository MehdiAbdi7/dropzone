import { Router } from "express";
import { uploadImage } from "../../middlewares/upload.js";
import { validate } from "../../middlewares/validate.js";
import { idParamsSchema } from "../../utils/idParams.js";
import {
  getCatalog,
  getCatalogBrand,
  getCatalogCategory,
  getCatalogSeries,
  patchSeries,
  postSeries,
  postSeriesCover,
  putSeriesModels,
  removeSeries,
} from "./seriesAdmin.controller.js";
import { seriesBodySchema, seriesModelsSchema } from "./series.schema.js";

// Monté sous /admin, déjà protégé par requireAuth et requireRole("admin").
export const seriesAdminRouter = Router();

// Les trois écrans du Catalogue (et la page d'une catégorie).
seriesAdminRouter.get("/catalog", getCatalog);
seriesAdminRouter.get("/catalog/categories/:id", validate({ params: idParamsSchema }), getCatalogCategory);
seriesAdminRouter.get("/catalog/brands/:id", validate({ params: idParamsSchema }), getCatalogBrand);
seriesAdminRouter.get("/catalog/series/:id", validate({ params: idParamsSchema }), getCatalogSeries);

// La gestion des séries.
seriesAdminRouter.post(
  "/brands/:id/series",
  validate({ params: idParamsSchema, body: seriesBodySchema }),
  postSeries,
);
seriesAdminRouter.patch("/series/:id", validate({ params: idParamsSchema, body: seriesBodySchema }), patchSeries);
seriesAdminRouter.post("/series/:id/cover", validate({ params: idParamsSchema }), uploadImage, postSeriesCover);
seriesAdminRouter.delete("/series/:id", validate({ params: idParamsSchema }), removeSeries);
seriesAdminRouter.put(
  "/series/:id/models",
  validate({ params: idParamsSchema, body: seriesModelsSchema }),
  putSeriesModels,
);
