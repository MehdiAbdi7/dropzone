import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { getToday, postClose, postOpen } from "./cash.controller.js";
import { closeCashSchema, openCashSchema } from "./cash.schema.js";

// Monté sous /admin, déjà protégé.
export const cashAdminRouter = Router();
cashAdminRouter.get("/cash/today", getToday);
cashAdminRouter.post("/cash/open", validate({ body: openCashSchema }), postOpen);
cashAdminRouter.post("/cash/close", validate({ body: closeCashSchema }), postClose);
