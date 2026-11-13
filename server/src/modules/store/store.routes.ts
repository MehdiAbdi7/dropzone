import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { getHours, putHours } from "./store.controller.js";
import { storeHoursSchema } from "./store.schema.js";

export const storeRouter = Router();
storeRouter.get("/hours", getHours);

// Monté sous /admin, déjà protégé.
export const storeAdminRouter = Router();
storeAdminRouter.put("/store/hours", validate({ body: storeHoursSchema }), putHours);
