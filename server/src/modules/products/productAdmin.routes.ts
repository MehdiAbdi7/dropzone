import { Router } from "express";
import { uploadImage, uploadMedia } from "../../middlewares/upload.js";
import { validate } from "../../middlewares/validate.js";
import { idParamsSchema } from "../../utils/idParams.js";
import {
  deleteVariantMedia,
  getGiftOptions,
  getProduct,
  getProducts,
  getVariants,
  patchProduct,
  postImage,
  postProduct,
  postVariantMedia,
  putMainImage,
  putVariantMediaOrder,
  removeProduct,
  removeProductImage,
} from "./productAdmin.controller.js";
import {
  adminProductListQuerySchema,
  imageParamsSchema,
  mediaOrderBodySchema,
  mediaParamsSchema,
  productBodySchema,
  variantSearchQuerySchema,
} from "./product.schema.js";

// Monté sous /admin, déjà protégé par requireAuth et requireRole("admin").
export const productAdminRouter = Router();

productAdminRouter.get("/gift-options", getGiftOptions);
// Les photos et la vidéo d'une variante (26/11) : admin seulement, comme tout ce qui n'est pas dans la table des droits.
productAdminRouter.post("/variants/:id/media", validate({ params: idParamsSchema }), uploadMedia, postVariantMedia);
productAdminRouter.put(
  "/variants/:id/media/order",
  validate({ params: idParamsSchema, body: mediaOrderBodySchema }),
  putVariantMediaOrder,
);
productAdminRouter.delete("/variants/:id/media/:mediaId", validate({ params: mediaParamsSchema }), deleteVariantMedia);
// Le sélecteur de variantes du comptoir : vente au magasin et fenêtre « Modifier » (lot 3).
productAdminRouter.get("/variants", validate({ query: variantSearchQuerySchema }), getVariants);
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
// Changer la photo principale d'un clic (24/11) : remplace la première photo, sans toucher aux autres.
productAdminRouter.put(
  "/products/:id/main-image",
  validate({ params: idParamsSchema }),
  uploadImage,
  putMainImage,
);
productAdminRouter.delete(
  "/products/:id/images/:imageId",
  validate({ params: imageParamsSchema }),
  removeProductImage,
);
