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
  patchStatus,
  postOrder,
  postPreview,
  postTrack,
} from "./order.controller.js";
import {
  adminOrderListQuerySchema,
  createOrderSchema,
  orderNumberParamsSchema,
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
orderAdminRouter.patch(
  "/orders/:id/status",
  validate({ params: idParamsSchema, body: statusBodySchema }),
  patchStatus,
);
