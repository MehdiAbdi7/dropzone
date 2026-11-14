import type { Request, Response } from "express";
import type { AdminProductListQuery, VariantSearchQuery } from "./product.schema.js";
import { searchVariants } from "./variantSearch.service.js";
import {
  addImage,
  createProduct,
  deleteProduct,
  getAdminProduct,
  listAdminProducts,
  listGiftOptions,
  removeImage,
  updateProduct,
} from "./productAdmin.service.js";

export async function getVariants(_req: Request, res: Response) {
  res.json({ data: await searchVariants(res.locals.query as VariantSearchQuery) });
}

export async function getProducts(_req: Request, res: Response) {
  res.json(await listAdminProducts(res.locals.query as AdminProductListQuery));
}

export async function getProduct(req: Request, res: Response) {
  res.json({ data: await getAdminProduct(Number(req.params.id)) });
}

export async function postProduct(req: Request, res: Response) {
  res.status(201).json({ data: await createProduct(req.body) });
}

export async function patchProduct(req: Request, res: Response) {
  res.json({ data: await updateProduct(Number(req.params.id), req.body) });
}

export async function removeProduct(req: Request, res: Response) {
  await deleteProduct(Number(req.params.id));
  res.status(204).end();
}

export async function postImage(req: Request, res: Response) {
  res.status(201).json({ data: await addImage(Number(req.params.id), req.file) });
}

export async function removeProductImage(req: Request, res: Response) {
  await removeImage(Number(req.params.id), Number(req.params.imageId));
  res.status(204).end();
}

export async function getGiftOptions(_req: Request, res: Response) {
  res.json({ data: await listGiftOptions() });
}
