import { Router } from "express";
import { uploadImage } from "../../middlewares/upload.js";
import { validate } from "../../middlewares/validate.js";
import { idParamsSchema } from "../../utils/idParams.js";
import {
  getGiftOptions,
  getProduct,
  getProducts,
  patchProduct,
  postImage,
  postProduct,
  removeProduct,
  removeProductImage,
} from "./productAdmin.controller.js";
import {
  adminProductListQuerySchema,
  imageParamsSchema,
  productBodySchema,
} from "./product.schema.js";

// Monté sous /admin, déjà protégé par requireAuth et requireRole("admin").
export const productAdminRouter = Router();

productAdminRouter.get("/gift-options", getGiftOptions);
productAdminRouter.get("/products", validate({ query: adminProductListQuerySchema }), getProducts);
productAdminRouter.post("/products", validate({ body: productBodySchema }), postProduct);
productAdminRouter.get("/products/:id", validate({ params: idParamsSchema }), getProduct);
productAdminRouter.patch(
  "/products/:id",
  validate({ params: idParamsSchema, body: productBodySchema }),
  patchProduct,
);
productAdminRouter.delete("/products/:id", validate({ params: idParamsSchema }), removeProduct);
productAdminRouter.post(
  "/products/:id/images",
  validate({ params: idParamsSchema }),
  uploadImage,
  postImage,
);
productAdminRouter.delete(
  "/products/:id/images/:imageId",
  validate({ params: imageParamsSchema }),
  removeProductImage,
);
