import { uploadToCloudinary } from "../../config/cloudinary.js";
import { prisma } from "../../config/db.js";
import type { Condition } from "../../generated/prisma/client.js";
import { AppError } from "../../utils/AppError.js";
import { requireSlug } from "../../utils/slugify.js";
import { colorsOf, compareSeries, resolvePosterColor } from "./series.service.js";

// ---------- Les compteurs du Catalogue ----------
// Le back-office compte tous les produits, brouillons compris : le gérant gère aussi ce
// qui n'est pas encore en vente.

function stockOf(variants: { condition: Condition; stock: number }[]) {
  return {
    newStock: variants.filter((v) => v.condition === "new").reduce((sum, v) => sum + v.stock, 0),
    dealCount: variants.filter((v) => v.condition === "refurbished" && v.stock > 0).length,
  };
}

const VARIANT_STOCK = { select: { condition: true, stock: true } } as const;

// Écran 1 : une tuile par catégorie.
export async function catalogOverview() {
  const categories = await prisma.category.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      kind: true,
      brands: { select: { series: { select: { _count: { select: { models: true } } } } } },
      products: { select: { variants: VARIANT_STOCK } },
    },
  });
  return categories.map(({ brands, products, ...category }) => {
    const series = brands.flatMap((brand) => brand.series);
    return {
      ...category,
      brandCount: brands.length,
      seriesCount: series.length,
      modelCount: series.reduce((sum, one) => sum + one._count.models, 0),
      productCount: products.length,
      ...stockOf(products.flatMap((product) => product.variants)),
    };
  });
}

// Une catégorie : une tuile par marque.
export async function catalogCategory(id: number) {
  const category = await prisma.category.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      kind: true,
      brands: {
        orderBy: [{ position: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          _count: { select: { series: true } },
          products: { select: { variants: VARIANT_STOCK } },
        },
      },
    },
  });
  if (!category) {
    throw new AppError(404, "Catégorie introuvable");
  }
  const { brands, ...rest } = category;
  return {
    category: rest,
    brands: brands.map(({ _count, products, ...brand }) => ({
      ...brand,
      seriesCount: _count.series,
      productCount: products.length,
      ...stockOf(products.flatMap((product) => product.variants)),
    })),
  };
}

// Les produits d'un modèle, avec ce qu'il faut pour le stock, la photo, les couleurs, et
// le statut : un brouillon n'est pas en vente, même avec du stock (grisé sur l'affiche).
const MODEL_PRODUCTS = {
  orderBy: { id: "asc" },
  select: {
    id: true,
    slug: true,
    status: true,
    images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
    variants: { orderBy: { id: "asc" }, select: { condition: true, stock: true, price: true, options: true } },
  },
} as const;

// Écran 2 : les séries d'une marque, dans l'ordre de la Boutique (la plus récente
// d'abord), et les produits en vente rangés dans aucune série.
export async function catalogBrand(id: number) {
  const brand = await prisma.brand.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      category: { select: { id: true, name: true, slug: true, kind: true } },
      series: {
        select: {
          id: true,
          name: true,
          slug: true,
          coverUrl: true,
          models: {
            orderBy: [{ seriesPosition: "asc" }, { id: "asc" }],
            select: { id: true, releaseYear: true, posterColor: true, products: MODEL_PRODUCTS },
          },
        },
      },
    },
  });
  if (!brand) {
    throw new AppError(404, "Marque introuvable");
  }
  const unassigned = await prisma.product.findMany({
    where: { brandId: id, deviceModel: { seriesId: null } },
    orderBy: { id: "asc" },
    select: { id: true, deviceModel: { select: { id: true, name: true } } },
  });

  const series = brand.series
    .map(({ models, ...one }) => {
      const products = models.flatMap((model) => model.products);
      const first = models.find((model) => model.products.length > 0);
      const firstProduct = first?.products[0];
      return {
        years: models.map((model) => model.releaseYear),
        tile: {
          ...one,
          modelCount: models.length,
          // Pour ranger un modèle de plus : la liste complète, dans l'ordre de l'affiche.
          modelIds: models.map((model) => model.id),
          ...stockOf(products.flatMap((product) => product.variants)),
          fallbackImage: products.find((product) => product.images[0])?.images[0]?.url ?? null,
          fallbackColor: first && firstProduct ? resolvePosterColor(first.posterColor, colorsOf(firstProduct.variants)) : null,
        },
      };
    })
    .sort((a, b) => compareSeries({ name: a.tile.name, years: a.years }, { name: b.tile.name, years: b.years }))
    .map(({ tile }) => tile);

  return {
    brand: { id: brand.id, name: brand.name, slug: brand.slug, category: brand.category },
    series,
    unassigned: unassigned.flatMap((product) =>
      product.deviceModel ? [{ deviceModelId: product.deviceModel.id, name: product.deviceModel.name, productId: product.id }] : [],
    ),
  };
}

// Écran 3 : une série, ses modèles dans l'ordre de l'affiche, et les modèles sans série
// du même fabricant et du même type qu'on peut y ajouter.
export async function catalogSeries(id: number) {
  const series = await prisma.series.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      coverUrl: true,
      brand: {
        select: { id: true, name: true, slug: true, makerName: true, category: { select: { id: true, name: true, slug: true, kind: true } } },
      },
      models: {
        orderBy: [{ seriesPosition: "asc" }, { id: "asc" }],
        select: { id: true, name: true, releaseYear: true, seriesPosition: true, posterColor: true, products: MODEL_PRODUCTS },
      },
    },
  });
  if (!series) {
    throw new AppError(404, "Série introuvable");
  }
  const { makerName, category } = series.brand;
  const candidates = makerName
    ? await prisma.deviceModel.findMany({
        where: { seriesId: null, brand: makerName, kind: category.kind },
        orderBy: [{ releaseYear: { sort: "desc", nulls: "last" } }, { name: "asc" }],
        select: { id: true, name: true, releaseYear: true },
      })
    : [];

  return {
    series: { id: series.id, name: series.name, slug: series.slug, coverUrl: series.coverUrl, brand: { id: series.brand.id, name: series.brand.name, slug: series.brand.slug, makerName }, category },
    models: series.models.map(({ products, ...model }) => {
      const product = products[0];
      const colors = product ? colorsOf(product.variants) : [];
      return {
        ...model,
        colors: colors.map((color) => color.name),
        product: product
          ? {
              id: product.id,
              slug: product.slug,
              status: product.status,
              image: product.images[0]?.url ?? null,
              ...stockOf(product.variants),
              soldOutColors: colors.filter((color) => !color.inStock).map((color) => color.name),
            }
          : null,
      };
    }),
    candidates,
  };
}

// ---------- La gestion des séries ----------

const SLUG_MESSAGE = "Le nom de la série doit contenir des lettres latines ou des chiffres";

// Un doublon dans la marque est refusé par la base (unique brandId + slug → 409).
export async function createSeries(brandId: number, name: string) {
  const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { id: true } });
  if (!brand) {
    throw new AppError(404, "Marque introuvable");
  }
  return prisma.series.create({ data: { brandId, name, slug: requireSlug(name, SLUG_MESSAGE) } });
}

export async function renameSeries(id: number, name: string) {
  return prisma.series.update({ where: { id }, data: { name, slug: requireSlug(name, SLUG_MESSAGE) } });
}

export async function setSeriesCover(id: number, file: Express.Multer.File | undefined) {
  if (!file) {
    throw new AppError(400, "Choisissez une image");
  }
  const series = await prisma.series.findUnique({ where: { id }, select: { id: true } });
  if (!series) {
    throw new AppError(404, "Série introuvable");
  }
  const uploaded = await uploadToCloudinary(file.buffer, "dropzone/series");
  return prisma.series.update({ where: { id }, data: { coverUrl: uploaded.url } });
}

// ON DELETE SET NULL : les modèles de la série redeviennent « sans série ».
export async function deleteSeries(id: number) {
  await prisma.series.delete({ where: { id } });
}

// La liste complète des modèles de la série, dans l'ordre de l'affiche. Un modèle absent
// de la liste quitte la série ; un modèle d'une autre série y est déplacé.
export async function setSeriesModels(id: number, modelIds: number[]) {
  const series = await prisma.series.findUnique({
    where: { id },
    select: { brand: { select: { makerName: true, category: { select: { kind: true } } } } },
  });
  if (!series) {
    throw new AppError(404, "Série introuvable");
  }
  const ids = [...new Set(modelIds)];
  const models = await prisma.deviceModel.findMany({ where: { id: { in: ids } }, select: { id: true, brand: true, kind: true } });
  if (models.length !== ids.length) {
    throw new AppError(404, "Modèle introuvable");
  }
  if (models.some((model) => model.brand !== series.brand.makerName || model.kind !== series.brand.category.kind)) {
    throw new AppError(400, "Ce modèle n'est pas de cette marque");
  }
  await prisma.$transaction([
    prisma.deviceModel.updateMany({
      where: { seriesId: id, id: { notIn: ids } },
      data: { seriesId: null, seriesPosition: 0 },
    }),
    ...ids.map((modelId, index) =>
      prisma.deviceModel.update({ where: { id: modelId }, data: { seriesId: id, seriesPosition: index } }),
    ),
  ]);
}
