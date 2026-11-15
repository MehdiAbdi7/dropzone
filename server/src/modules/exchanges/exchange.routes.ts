import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { idParamsSchema } from "../../utils/idParams.js";
import { getTradeIns, postExchange, postPublishTradeIn } from "./exchange.controller.js";
import { exchangeBodySchema, publishTradeInBodySchema, tradeInListQuerySchema } from "./exchange.schema.js";

// Monté sous /admin, déjà protégé.
export const exchangeAdminRouter = Router();

// Un échange saisi au comptoir : le client rend un téléphone, en prend un autre (lot 5).
exchangeAdminRouter.post("/exchanges", validate({ body: exchangeBodySchema }), postExchange);
// Les reprises à mettre en vente, et leur mise en vente au prix que fixe l'admin.
exchangeAdminRouter.get("/trade-ins", validate({ query: tradeInListQuerySchema }), getTradeIns);
exchangeAdminRouter.post(
  "/trade-ins/:id/publish",
  validate({ params: idParamsSchema, body: publishTradeInBodySchema }),
  postPublishTradeIn,
);
