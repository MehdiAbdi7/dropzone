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
// Corriger l'année, les couleurs officielles du modèle (pastilles de l'affiche), ou choisir
// la lueur parmi elles (null = la première couleur officielle).
const colorName = z.string().trim().min(1).max(40);
const patchSchema = z
  .object({
    releaseYear: releaseYear.optional(),
    colors: z.array(colorName).max(20).optional(),
    posterColor: colorName.nullable().optional(),
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
      colors: true,
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

// Une année fausse rangerait mal le modèle. Les couleurs officielles sont des noms de la
// liste « Couleurs » (leur teinte donne les pastilles), dans l'ordre donné, sans doublon.
// La lueur est une de ces couleurs : en retirer la couleur fait revenir la lueur par défaut.
async function patchModel(req: Request, res: Response) {
  const body = req.body as z.infer<typeof patchSchema>;
  const current = await prisma.deviceModel.findUnique({
    where: { id: Number(req.params.id) },
    select: { colors: true, posterColor: true },
  });
  if (!current) {
    throw new AppError(404, "Modèle introuvable");
  }

  const colors = body.colors ? [...new Set(body.colors)] : undefined;
  if (colors && colors.length > 0) {
    const known = await prisma.choice.count({ where: { group: "color", label: { in: colors } } });
    if (known !== colors.length) {
      throw new AppError(400, "Choisissez des couleurs de la liste « Couleurs »");
    }
  }
  const officialColors = colors ?? current.colors;
  if (body.posterColor && !officialColors.includes(body.posterColor)) {
    throw new AppError(400, "Choisissez la lueur parmi les couleurs du modèle");
  }
  // Sans nouvelle lueur, l'ancienne est gardée si elle reste une couleur du modèle.
  const posterColor =
    body.posterColor !== undefined
      ? body.posterColor
      : current.posterColor && !officialColors.includes(current.posterColor)
        ? null
        : undefined;

  const model = await prisma.deviceModel.update({
    where: { id: Number(req.params.id) },
    data: { releaseYear: body.releaseYear, colors, posterColor },
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
