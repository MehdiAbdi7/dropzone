import type { Request, Response } from "express";
import type { ProductListQuery } from "./product.schema.js";
import { getProductBySlug, listProducts } from "./product.service.js";

export async function getProducts(_req: Request, res: Response) {
  res.json(await listProducts(res.locals.query as ProductListQuery));
}

export async function getProduct(req: Request, res: Response) {
  res.json({ data: await getProductBySlug(String(req.params.slug)) });
}
