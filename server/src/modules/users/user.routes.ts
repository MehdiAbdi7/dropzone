import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { idParamsSchema } from "../../utils/idParams.js";
import { getCustomers, postResetPassword } from "./user.controller.js";
import { customerListQuerySchema, resetPasswordSchema } from "./user.schema.js";

// Monté sous /admin, déjà protégé par requireAuth et requireRole("admin").
export const userAdminRouter = Router();
userAdminRouter.get("/customers", validate({ query: customerListQuerySchema }), getCustomers);
// Un nouveau mot de passe pour un client qui a oublié le sien (15/11).
userAdminRouter.post("/customers/:id/password", validate({ params: idParamsSchema, body: resetPasswordSchema }), postResetPassword);
