import type { Request, Response } from "express";
import {
  createBrand,
  deleteBrand,
  listAdminBrands,
  removeBrandPhoto,
  setBrandLogo,
  setBrandPhoto,
  updateBrand,
} from "./brand.service.js";

export async function getBrands(_req: Request, res: Response) {
  res.json({ data: await listAdminBrands() });
}

export async function postBrand(req: Request, res: Response) {
  res.status(201).json({ data: await createBrand(Number(req.params.id), req.body) });
}

export async function patchBrand(req: Request, res: Response) {
  res.json({ data: await updateBrand(Number(req.params.id), req.body) });
}

export async function postBrandLogo(req: Request, res: Response) {
  res.json({ data: await setBrandLogo(Number(req.params.id), req.file) });
}

export async function postBrandPhoto(req: Request, res: Response) {
  res.json({ data: await setBrandPhoto(Number(req.params.id), req.file) });
}

export async function removeBrandPhotoHandler(req: Request, res: Response) {
  await removeBrandPhoto(Number(req.params.id));
  res.status(204).end();
}

export async function removeBrand(req: Request, res: Response) {
  await deleteBrand(Number(req.params.id));
  res.status(204).end();
}
