import { Router } from "express";
import { uploadImage } from "../../middlewares/upload.js";
import { validate } from "../../middlewares/validate.js";
import { idParamsSchema } from "../../utils/idParams.js";
import { getMakers, getPoster, patchMaker, postMaker, postMakerLogo, removeMaker } from "./accessory.controller.js";
import { accessoryMakerBodySchema, accessoryMakerPatchSchema, accessoryPosterParamsSchema } from "./accessoryMaker.schema.js";

// Public : l'affiche d'une marque d'accessoires.
export const accessoryRouter = Router();
accessoryRouter.get("/:category/:type/:maker", validate({ params: accessoryPosterParamsSchema }), getPoster);

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
