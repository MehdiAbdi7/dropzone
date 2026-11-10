import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { idParamsSchema } from "../../utils/idParams.js";
import {
  getChoices,
  getColors,
  patchChoice,
  patchChoiceList,
  postChoice,
  postChoiceList,
  removeChoice,
  removeChoiceList,
} from "./choice.controller.js";
import { choiceBodySchema, choiceListBodySchema, choiceListPatchSchema, choicePatchSchema } from "./choice.schema.js";

// Public : la palette des couleurs, pour les pastilles et les lueurs de la boutique.
export const colorRouter = Router();
colorRouter.get("/", getColors);

// Monté sous /admin, déjà protégé par requireAuth et requireRole("admin").
export const choiceAdminRouter = Router();
choiceAdminRouter.get("/choices", getChoices);
choiceAdminRouter.post("/choices", validate({ body: choiceBodySchema }), postChoice);
choiceAdminRouter.patch("/choices/:id", validate({ params: idParamsSchema, body: choicePatchSchema }), patchChoice);
choiceAdminRouter.delete("/choices/:id", validate({ params: idParamsSchema }), removeChoice);
choiceAdminRouter.post("/choice-lists", validate({ body: choiceListBodySchema }), postChoiceList);
choiceAdminRouter.patch(
  "/choice-lists/:id",
  validate({ params: idParamsSchema, body: choiceListPatchSchema }),
  patchChoiceList,
);
choiceAdminRouter.delete("/choice-lists/:id", validate({ params: idParamsSchema }), removeChoiceList);
