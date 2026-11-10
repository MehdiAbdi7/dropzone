import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { idParamsSchema } from "../../utils/idParams.js";
import { getCategories, patchCategory, postCategory, removeCategory } from "./category.controller.js";
import { categoryBodySchema, categoryPatchSchema } from "./category.schema.js";

export const categoryRouter = Router();
categoryRouter.get("/", getCategories);

export const categoryAdminRouter = Router();
// Monté sous /admin, déjà protégé par requireAuth et requireRole("admin").
categoryAdminRouter.post("/categories", validate({ body: categoryBodySchema }), postCategory);
categoryAdminRouter.patch(
  "/categories/:id",
  validate({ params: idParamsSchema, body: categoryPatchSchema }),
  patchCategory,
);
categoryAdminRouter.delete("/categories/:id", validate({ params: idParamsSchema }), removeCategory);
