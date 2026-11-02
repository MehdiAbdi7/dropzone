import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { deleteCategory, getCategories, patchCategory, postCategory } from "./category.controller.js";
import { categoryBodySchema, categoryIdSchema, categoryPatchSchema } from "./category.schema.js";

export const categoryRouter = Router();
categoryRouter.get("/", getCategories);

export const categoryAdminRouter = Router();
categoryAdminRouter.post("/categories", validate({ body: categoryBodySchema }), postCategory);
categoryAdminRouter.patch(
  "/categories/:id",
  validate({ params: categoryIdSchema, body: categoryPatchSchema }),
  patchCategory,
);
categoryAdminRouter.delete("/categories/:id", validate({ params: categoryIdSchema }), deleteCategory);
