import type { Request, Response } from "express";
import type { CategoryBody, CategoryPatch } from "./category.schema.js";
import { createCategory, deleteCategory, listCategories, updateCategory } from "./category.service.js";

export async function getCategories(_req: Request, res: Response) {
  res.json({ data: await listCategories() });
}

export async function postCategory(req: Request, res: Response) {
  res.status(201).json({ data: await createCategory(req.body as CategoryBody) });
}

export async function patchCategory(req: Request, res: Response) {
  res.json({ data: await updateCategory(Number(req.params.id), req.body as CategoryPatch) });
}

export async function removeCategory(req: Request, res: Response) {
  await deleteCategory(Number(req.params.id));
  res.status(204).end();
}
