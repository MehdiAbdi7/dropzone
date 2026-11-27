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
  replaceMainImage,
  updateProduct,
} from "./productAdmin.service.js";
import { addVariantMedia, addVariantStory, removeVariantMedia, reorderVariantMedia } from "./variantMedia.service.js";

export async function postVariantMedia(req: Request, res: Response) {
  res.status(201).json({ data: await addVariantMedia(Number(req.params.id), req.file) });
}

export async function postVariantStory(req: Request, res: Response) {
  res.status(201).json({ data: await addVariantStory(Number(req.params.id), (req.body as { url: string }).url) });
}

export async function deleteVariantMedia(req: Request, res: Response) {
  await removeVariantMedia(Number(req.params.id), Number(req.params.mediaId));
  res.status(204).end();
}

export async function putVariantMediaOrder(req: Request, res: Response) {
  res.json({ data: await reorderVariantMedia(Number(req.params.id), (req.body as { ids: number[] }).ids) });
}

export async function getVariants(_req: Request, res: Response) {
  const { hits, total } = await searchVariants(res.locals.query as VariantSearchQuery);
  res.json({ data: hits, meta: { total } });
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

export async function putMainImage(req: Request, res: Response) {
  res.json({ data: await replaceMainImage(Number(req.params.id), req.file) });
}

export async function removeProductImage(req: Request, res: Response) {
  await removeImage(Number(req.params.id), Number(req.params.imageId));
  res.status(204).end();
}

export async function getGiftOptions(_req: Request, res: Response) {
  res.json({ data: await listGiftOptions() });
}
