import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { idParamsSchema } from "../../utils/idParams.js";
import { getSettings, postInvoice, putSettings } from "./invoice.controller.js";
import { invoiceSettingsSchema } from "./invoice.schema.js";

// Monté sous /admin, déjà protégé.
export const invoiceAdminRouter = Router();

invoiceAdminRouter.get("/invoice-settings", getSettings);
invoiceAdminRouter.put("/invoice-settings", validate({ body: invoiceSettingsSchema }), putSettings);
invoiceAdminRouter.post("/orders/:id/invoice", validate({ params: idParamsSchema }), postInvoice);
