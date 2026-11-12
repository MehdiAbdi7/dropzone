import { Router } from "express";
import { uploadImage } from "../../middlewares/upload.js";
import { validate } from "../../middlewares/validate.js";
import { idParamsSchema } from "../../utils/idParams.js";
import { getCatalog, getMakers, patchMaker, postMaker, postMakerLogo, removeMaker } from "./accessory.controller.js";
import { accessoryCatalogParamsSchema, accessoryMakerBodySchema, accessoryMakerPatchSchema } from "./accessoryMaker.schema.js";

// Public : le catalogue d'une catégorie d'accessoires (page Accessoires de la Boutique).
export const accessoryRouter = Router();
accessoryRouter.get("/:category", validate({ params: accessoryCatalogParamsSchema }), getCatalog);

// Monté sous /admin, déjà protégé par requireAuth et requireRole("admin").
export const accessoryAdminRouter = Router();
accessoryAdminRouter.get("/accessory-makers", getMakers);
accessoryAdminRouter.post(
  "/brands/:id/makers",
  validate({ params: idParamsSchema, body: accessoryMakerBodySchema }),
  postMaker,
);
accessoryAdminRouter.patch(
  "/accessory-makers/:id",
  validate({ params: idParamsSchema, body: accessoryMakerPatchSchema }),
  patchMaker,
);
accessoryAdminRouter.post("/accessory-makers/:id/logo", validate({ params: idParamsSchema }), uploadImage, postMakerLogo);
accessoryAdminRouter.delete("/accessory-makers/:id", validate({ params: idParamsSchema }), removeMaker);
