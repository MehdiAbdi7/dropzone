import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { getCustomers } from "./user.controller.js";
import { customerListQuerySchema } from "./user.schema.js";

// Monté sous /admin, déjà protégé par requireAuth et requireRole("admin").
export const userAdminRouter = Router();
userAdminRouter.get("/customers", validate({ query: customerListQuerySchema }), getCustomers);
