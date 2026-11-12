import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import { escapeLike } from "../../utils/escapeLike.js";
import { screenSize } from "../../utils/screenSize.js";
import { sameColor } from "./modelColors.js";
import type { ModelBody, ModelListQuery, ModelPatch } from "./model.schema.js";
import { modelSlug } from "./modelSlug.js";

export async function listModels(query: ModelListQuery) {
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
  return models.map(({ _count, ...model }) => ({
    ...model,
    usage: _count.products + _count.compatibleProducts,
  }));
}

// Le couple (marque, nom) est unique : un doublon donne P2002 → 409.
export async function createModel({ brand, name, kind, releaseYear }: ModelBody) {
  return prisma.deviceModel.create({
    data: { brand, name, kind, releaseYear, slug: modelSlug(brand, name) },
  });
}

// Une année fausse rangerait mal le modèle. Les couleurs officielles sont des noms de la
// liste « Couleurs » (leur teinte donne les pastilles), dans l'ordre donné, sans doublon.
// La lueur est une de ces couleurs : en retirer la couleur fait revenir la lueur par défaut.
export async function updateModel(id: number, body: ModelPatch) {
  const current = await prisma.deviceModel.findUnique({
    where: { id },
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
  // Étape Couleur (relecture du 05/11) : les couleurs du modèle rangent ses exemplaires dans
  // la boutique. Retirer une couleur encore portée cacherait ces exemplaires : refusé.
  if (colors) {
    const removed = current.colors.filter((color) => !colors.some((kept) => sameColor(kept, color)));
    if (removed.length > 0) {
      const variants = await prisma.productVariant.findMany({
        where: { product: { deviceModelId: id } },
        select: { options: true },
      });
      for (const color of removed) {
        const count = variants.filter((v) => sameColor((v.options as Record<string, string>).Couleur ?? "", color)).length;
        if (count > 0) {
          throw new AppError(
            409,
            `La couleur « ${color} » est encore portée par ${count} exemplaire${count > 1 ? "s" : ""} : changez-les d'abord dans la fiche produit`,
          );
        }
      }
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

  return prisma.deviceModel.update({
    where: { id },
    data: { releaseYear: body.releaseYear, colors, posterColor },
  });
}

// ON DELETE RESTRICT depuis products : un modèle encore vendu est refusé (P2003 → 409).
export async function deleteModel(id: number) {
  await prisma.deviceModel.delete({ where: { id } });
}

// Les téléphones groupés par taille d'écran (back-office, 12/11) : le bouton « Ajouter les
// téléphones de 6,7 pouces » d'une variante de verre. La taille vient de la caractéristique
// « Écran » de la fiche du modèle ; un téléphone sans fiche ou sans taille lisible n'y est pas.
export async function listScreenSizes() {
  const products = await prisma.product.findMany({
    where: { deviceModel: { kind: "phone" } },
    select: { specs: true, deviceModel: { select: { id: true, brand: true, name: true } } },
    orderBy: [{ deviceModel: { brand: "asc" } }, { deviceModel: { name: "asc" } }],
  });
  const bySize = new Map<string, { id: number; brand: string; name: string }[]>();
  for (const { specs, deviceModel } of products) {
    const size = screenSize((specs as Record<string, string> | null)?.["Écran"]);
    if (size && deviceModel) {
      bySize.set(size, [...(bySize.get(size) ?? []), deviceModel]);
    }
  }
  return [...bySize]
    .sort(([a], [b]) => Number(a.split(" ")[0].replace(",", ".")) - Number(b.split(" ")[0].replace(",", ".")))
    .map(([size, models]) => ({ size, models }));
}
