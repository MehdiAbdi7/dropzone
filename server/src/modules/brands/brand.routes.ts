import { Router } from "express";
import { uploadImage } from "../../middlewares/upload.js";
import { validate } from "../../middlewares/validate.js";
import { categoryIdSchema } from "../categories/category.schema.js";
import { getBrands, patchBrand, postBrand, postBrandLogo, removeBrand } from "./brand.controller.js";
import { brandBodySchema, brandIdSchema, brandPatchSchema } from "./brand.schema.js";

// Monté sous /admin, déjà protégé par requireAuth et requireRole("admin").
export const brandAdminRouter = Router();

brandAdminRouter.get("/brands", getBrands);
brandAdminRouter.post(
  "/categories/:id/brands",
  validate({ params: categoryIdSchema, body: brandBodySchema }),
  postBrand,
);
brandAdminRouter.patch("/brands/:id", validate({ params: brandIdSchema, body: brandPatchSchema }), patchBrand);
brandAdminRouter.post("/brands/:id/logo", validate({ params: brandIdSchema }), uploadImage, postBrandLogo);
brandAdminRouter.delete("/brands/:id", validate({ params: brandIdSchema }), removeBrand);
