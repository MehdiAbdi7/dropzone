import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { idParamsSchema } from "../../utils/idParams.js";
import { getTradeIns, patchTradeIn, postDismantleTradeIn, postExchange, postPublishTradeIn, postTradeInPart } from "./exchange.controller.js";
import {
  dismantleBodySchema,
  exchangeBodySchema,
  publishTradeInBodySchema,
  tradeInListQuerySchema,
  updateTradeInBodySchema,
  useTradeInPartBodySchema,
} from "./exchange.schema.js";

// Monté sous /admin, déjà protégé.
export const exchangeAdminRouter = Router();

// Un échange saisi au comptoir : le client rend un téléphone, en prend un autre (lot 5).
exchangeAdminRouter.post("/exchanges", validate({ body: exchangeBodySchema }), postExchange);
// Les reprises à mettre en vente, et leur mise en vente au prix que fixe l'admin.
exchangeAdminRouter.get("/trade-ins", validate({ query: tradeInListQuerySchema }), getTradeIns);
// Modifier la fiche d'une reprise (batterie remplacée…) avant de la mettre en vente (18/11).
exchangeAdminRouter.patch("/trade-ins/:id", validate({ params: idParamsSchema, body: updateTradeInBodySchema }), patchTradeIn);
exchangeAdminRouter.post(
  "/trade-ins/:id/publish",
  validate({ params: idParamsSchema, body: publishTradeInBodySchema }),
  postPublishTradeIn,
);
// Les pièces d'une reprise (atelier, étape 6) : la démonter pour pièces, ou en utiliser une pour la remettre en état.
// Absentes de la table des droits : admin seul, comme la page Reprises.
exchangeAdminRouter.post("/trade-ins/:id/dismantle", validate({ params: idParamsSchema, body: dismantleBodySchema }), postDismantleTradeIn);
exchangeAdminRouter.post("/trade-ins/:id/parts", validate({ params: idParamsSchema, body: useTradeInPartBodySchema }), postTradeInPart);
