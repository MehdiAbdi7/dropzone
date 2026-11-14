import type { Request, Response } from "express";
import type { AdminOrderListQuery } from "./order.schema.js";
import {
  changeOrderStatus,
  createOrder,
  getAdminOrder,
  getMyOrder,
  listAdminOrders,
  listMyOrders,
  previewCart,
  trackOrder,
  validatePickup,
} from "./order.service.js";
import { deleteOrder, editOrder } from "./orderEdit.service.js";
import { createStoreSale } from "./storeSale.service.js";

// La vente au magasin (16/11, lot 3) : créée et encaissée au comptoir.
export async function postSale(req: Request, res: Response) {
  res.status(201).json({ data: await createStoreSale(req.body, res.locals.user!.id) });
}

export async function postPreview(req: Request, res: Response) {
  res.json({ data: await previewCart(req.body.items, req.body.fulfillment) });
}

export async function postOrder(req: Request, res: Response) {
  res.status(201).json({ data: await createOrder(req.body, res.locals.user?.id) });
}

export async function postTrack(req: Request, res: Response) {
  res.json({ data: await trackOrder(req.body.number, req.body.phone) });
}

export async function getMine(_req: Request, res: Response) {
  res.json({ data: await listMyOrders(res.locals.user!.id) });
}

export async function getMineOne(req: Request, res: Response) {
  res.json({ data: await getMyOrder(res.locals.user!.id, Number(req.params.number)) });
}

export async function getAdminOrders(_req: Request, res: Response) {
  res.json(await listAdminOrders(res.locals.query as AdminOrderListQuery));
}

export async function getAdminOrderOne(req: Request, res: Response) {
  res.json({ data: await getAdminOrder(Number(req.params.id)) });
}

export async function postPickup(req: Request, res: Response) {
  res.json({
    data: await validatePickup(Number(req.params.id), req.body.method, res.locals.user!.id, req.body.prices),
  });
}

export async function patchOrder(req: Request, res: Response) {
  res.json({ data: await editOrder(Number(req.params.id), req.body, res.locals.user!.id) });
}

export async function removeOrder(req: Request, res: Response) {
  res.json({ data: await deleteOrder(Number(req.params.id), res.locals.user!.id) });
}

export async function patchStatus(req: Request, res: Response) {
  res.json({
    data: await changeOrderStatus(Number(req.params.id), req.body.status, res.locals.user!.id, req.body.prices),
  });
}
