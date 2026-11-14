import { Router } from "express";
import { optionalAuth, requireAuth } from "../../middlewares/auth.js";
import { orderLimiter, trackLimiter } from "../../middlewares/rateLimiters.js";
import { validate } from "../../middlewares/validate.js";
import { idParamsSchema } from "../../utils/idParams.js";
import {
  getAdminOrderOne,
  getAdminOrders,
  getMine,
  getMineOne,
  patchOrder,
  patchStatus,
  postOrder,
  postPickup,
  postPreview,
  postTrack,
  removeOrder,
} from "./order.controller.js";
import {
  adminOrderListQuerySchema,
  createOrderSchema,
  editOrderBodySchema,
  orderNumberParamsSchema,
  pickupBodySchema,
  previewBodySchema,
  statusBodySchema,
  trackOrderSchema,
} from "./order.schema.js";

export const orderRouter = Router();

orderRouter.post("/preview", validate({ body: previewBodySchema }), postPreview);
orderRouter.post("/", orderLimiter, optionalAuth, validate({ body: createOrderSchema }), postOrder);
orderRouter.post("/track", trackLimiter, validate({ body: trackOrderSchema }), postTrack);
orderRouter.get("/mine", requireAuth, getMine);
orderRouter.get("/mine/:number", requireAuth, validate({ params: orderNumberParamsSchema }), getMineOne);

// Monté sous /admin, déjà protégé.
export const orderAdminRouter = Router();
orderAdminRouter.get("/orders", validate({ query: adminOrderListQuerySchema }), getAdminOrders);
orderAdminRouter.get("/orders/:id", validate({ params: idParamsSchema }), getAdminOrderOne);
// Modifier une commande après coup (15/11, lot 2) : stock, argent et trace suivent.
orderAdminRouter.patch(
  "/orders/:id",
  validate({ params: idParamsSchema, body: editOrderBodySchema }),
  patchOrder,
);
orderAdminRouter.delete("/orders/:id", validate({ params: idParamsSchema }), removeOrder);
orderAdminRouter.patch(
  "/orders/:id/status",
  validate({ params: idParamsSchema, body: statusBodySchema }),
  patchStatus,
);
// Valider un retrait au comptoir : le client paie, l'argent entre dans la caisse du jour (14/11).
orderAdminRouter.post(
  "/orders/:id/pickup",
  validate({ params: idParamsSchema, body: pickupBodySchema }),
  postPickup,
);
