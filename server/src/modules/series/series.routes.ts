import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { getOneSeries, getSeriesList } from "./series.controller.js";
import { seriesListQuerySchema, seriesParamsSchema } from "./series.schema.js";

export const seriesRouter = Router();
seriesRouter.get("/", validate({ query: seriesListQuerySchema }), getSeriesList);
seriesRouter.get("/:category/:brand/:serie", validate({ params: seriesParamsSchema }), getOneSeries);
