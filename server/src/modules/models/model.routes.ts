import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { validate } from "../../middlewares/validate.js";
import { AppError } from "../../utils/AppError.js";
import { escapeLike } from "../../utils/escapeLike.js";
import { modelSlug } from "./modelSlug.js";

// Les modèles d'appareils (« Apple iPhone 15 Pro Max ») proposés dans le formulaire produit.
// Pas de service : aucune règle métier, seulement des lectures et des écritures simples.
const deviceKind = z.enum(["phone", "tablet", "laptop", "watch"]);

const listQuerySchema = z.object({
  kind: deviceKind.optional(),
  q: z.string().trim().min(1).max(60).optional(),
});
// L'année de sortie range les modèles dans la Boutique : obligatoire pour un nouveau modèle.
const releaseYear = z.number().int().min(2000).max(2100);
const bodySchema = z.object({
  brand: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(80),
  kind: deviceKind,
  releaseYear,
});
// Corriger l'année, ou choisir la couleur de la lueur de l'affiche (null = automatique).
const patchSchema = z
  .object({
    releaseYear: releaseYear.optional(),
    posterColor: z.string().trim().min(1).max(40).nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { error: "Rien à modifier" });
const idSchema = z.object({ id: z.coerce.number().int().positive() });

async function getModels(_req: Request, res: Response) {
  const query = res.locals.query as z.infer<typeof listQuerySchema>;
  const contains = query.q ? escapeLike(query.q) : undefined;
  const models = await prisma.deviceModel.findMany({
    where: {
      kind: query.kind,
      OR: contains
        ? [
            { name: { contains, mode: "insensitive" } },
            { brand: { contains, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: [{ kind: "asc" }, { brand: "asc" }, { name: "asc" }],
    select: {
      id: true,
      brand: true,
      name: true,
      slug: true,
      kind: true,
      releaseYear: true,
      _count: { select: { products: true, compatibleProducts: true } },
    },
  });
  res.json({
    data: models.map(({ _count, ...model }) => ({
      ...model,
      usage: _count.products + _count.compatibleProducts,
    })),
  });
}

// Le couple (marque, nom) est unique : un doublon donne P2002 → 409.
async function postModel(req: Request, res: Response) {
  const { brand, name, kind, releaseYear } = req.body as z.infer<typeof bodySchema>;
  const model = await prisma.deviceModel.create({
    data: { brand, name, kind, releaseYear, slug: modelSlug(brand, name) },
  });
  res.status(201).json({ data: model });
}

// Une année fausse rangerait mal le modèle. La lueur est une couleur de la liste
// « Couleurs », pour rester d'accord avec les pastilles. Id inconnu : P2025 → 404.
async function patchModel(req: Request, res: Response) {
  const { releaseYear, posterColor } = req.body as z.infer<typeof patchSchema>;
  if (posterColor) {
    const known = await prisma.choice.findUnique({ where: { group_label: { group: "color", label: posterColor } } });
    if (!known) {
      throw new AppError(400, "Choisissez une couleur de la liste « Couleurs »");
    }
  }
  const model = await prisma.deviceModel.update({
    where: { id: Number(req.params.id) },
    data: { releaseYear, posterColor },
  });
  res.json({ data: model });
}

// ON DELETE RESTRICT depuis products : un modèle encore vendu est refusé (P2003 → 409).
async function deleteModel(req: Request, res: Response) {
  await prisma.deviceModel.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
}

export const modelAdminRouter = Router();
modelAdminRouter.get("/models", validate({ query: listQuerySchema }), getModels);
modelAdminRouter.post("/models", validate({ body: bodySchema }), postModel);
modelAdminRouter.patch("/models/:id", validate({ params: idSchema, body: patchSchema }), patchModel);
modelAdminRouter.delete("/models/:id", validate({ params: idSchema }), deleteModel);
