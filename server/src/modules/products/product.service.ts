import { prisma, type Tx } from "../../config/db.js";
import type { Condition, Prisma, ProductKind } from "../../generated/prisma/client.js";
import { AppError } from "../../utils/AppError.js";
import { escapeLike } from "../../utils/escapeLike.js";
import { paginate, paginationMeta } from "../../utils/pagination.js";
import type { ProductListQuery } from "./product.schema.js";

// Les catégories dont les produits ont un modèle d'appareil et peuvent être reconditionnés.
export const DEVICE_KINDS: ProductKind[] = ["phone", "laptop", "watch"];

// Le prix « à partir de » : la variante la moins chère encore en stock.
// Si tout est vendu, la moins chère tout court (la carte affiche alors « Rupture »).
export function computeMinPrice(variants: { price: number; stock: number }[]): number {
  if (variants.length === 0) {
    return 0;
  }
  const inStock = variants.filter((variant) => variant.stock > 0);
  const pool = inStock.length > 0 ? inStock : variants;
  return Math.min(...pool.map((variant) => variant.price));
}

// Recalcule minPrice après une commande, une annulation ou une modification.
// Reçoit le client de la transaction : le prix change en même temps que le stock.
export async function refreshMinPrice(tx: Tx, productIds: (number | null)[]): Promise<void> {
  const ids = new Set(productIds.filter((id): id is number => id !== null));
  for (const id of ids) {
    const variants = await tx.productVariant.findMany({
      where: { productId: id },
      select: { price: true, stock: true },
    });
    await tx.product.update({ where: { id }, data: { minPrice: computeMinPrice(variants) } });
  }
}

type ConditionFields = {
  condition: Condition;
  grade: number | null;
  batteryHealth: number | null;
  replacedParts: string[];
  defects: string[];
  limitations: string[];
};

// La fiche d'état en une ligne, recopiée dans la commande :
// « Note 9/10 · Batterie 87 % · Remplacé : batterie · Défauts : aucun · Limitations : aucune ».
export function buildConditionReport(variant: ConditionFields): string | null {
  if (variant.condition === "new") {
    return null;
  }
  const list = (items: string[], empty: string) => (items.length > 0 ? items.join(", ") : empty);
  return [
    `Note ${variant.grade}/10`,
    `Batterie ${variant.batteryHealth} %`,
    `Remplacé : ${list(variant.replacedParts, "rien")}`,
    `Défauts : ${list(variant.defects, "aucun")}`,
    `Limitations : ${list(variant.limitations, "aucune")}`,
  ].join(" · ");
}

const SORTS: Record<ProductListQuery["sort"], Prisma.ProductOrderByWithRelationInput[]> = {
  nouveautes: [{ createdAt: "desc" }, { id: "desc" }],
  "prix-croissant": [{ minPrice: "asc" }, { id: "asc" }],
  "prix-decroissant": [{ minPrice: "desc" }, { id: "desc" }],
};

export async function listProducts(query: ProductListQuery) {
  const filters: Prisma.ProductWhereInput[] = [];
  if (query.category) {
    filters.push({ category: { slug: query.category } });
  }
  if (query.q) {
    const contains = escapeLike(query.q);
    filters.push({
      OR: [
        { name: { contains, mode: "insensitive" } },
        { deviceModel: { brand: { contains, mode: "insensitive" } } },
      ],
    });
  }
  if (query.condition) {
    const condition: Condition = query.condition === "reconditionne" ? "refurbished" : "new";
    filters.push({ variants: { some: { condition, stock: { gt: 0 } } } });
  }
  if (query.model) {
    // Le produit de ce modèle, ou un accessoire compatible avec lui.
    filters.push({
      OR: [
        { deviceModel: { slug: query.model } },
        { compatibleModels: { some: { slug: query.model } } },
      ],
    });
  }
  if (query.offre === "affaire") {
    // Une affaire vendable : une variante encore en stock qui offre au moins un article.
    filters.push({ variants: { some: { stock: { gt: 0 }, gifts: { some: {} } } } });
  }
  const where: Prisma.ProductWhereInput = { status: "published", AND: filters };

  const [total, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: SORTS[query.sort],
      ...paginate(query.page, query.limit),
      select: {
        id: true,
        name: true,
        slug: true,
        minPrice: true,
        category: { select: { name: true, slug: true } },
        deviceModel: { select: { brand: true } },
        images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
        variants: {
          select: { condition: true, stock: true, gifts: { select: { id: true }, take: 1 } },
        },
      },
    }),
  ]);

  const data = products.map(({ variants, images, deviceModel, ...product }) => {
    const available = variants.filter((variant) => variant.stock > 0);
    return {
      ...product,
      brand: deviceModel?.brand ?? null,
      image: images[0]?.url ?? null,
      inStock: available.length > 0,
      hasNew: available.some((variant) => variant.condition === "new"),
      hasRefurbished: available.some((variant) => variant.condition === "refurbished"),
      hasDeal: available.some((variant) => variant.gifts.length > 0),
    };
  });

  return { data, pagination: paginationMeta(query.page, query.limit, total) };
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, status: "published" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      specs: true,
      minPrice: true,
      category: { select: { name: true, slug: true, kind: true } },
      deviceModel: { select: { brand: true, name: true, slug: true } },
      compatibleModels: {
        select: { brand: true, name: true, slug: true },
        orderBy: [{ brand: "asc" }, { name: "asc" }],
      },
      images: { orderBy: { position: "asc" }, select: { id: true, url: true } },
      // Les reconditionnés vendus (stock 0) ne s'affichent plus ; les neufs restent,
      // pour montrer « Rupture de stock » sur l'option choisie.
      variants: {
        where: { OR: [{ condition: "new" }, { stock: { gt: 0 } }] },
        orderBy: [{ condition: "asc" }, { price: "asc" }],
        select: {
          sku: true,
          options: true,
          price: true,
          stock: true,
          condition: true,
          grade: true,
          batteryHealth: true,
          replacedParts: true,
          defects: true,
          limitations: true,
          gifts: {
            select: {
              quantity: true,
              giftVariant: {
                select: {
                  sku: true,
                  options: true,
                  price: true,
                  stock: true,
                  product: {
                    select: {
                      name: true,
                      images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!product) {
    throw new AppError(404, "Produit introuvable");
  }

  return {
    ...product,
    variants: product.variants.map(({ gifts, ...variant }) => ({
      ...variant,
      gifts: gifts.map(({ quantity, giftVariant }) => ({
        sku: giftVariant.sku,
        name: giftVariant.product.name,
        options: giftVariant.options,
        price: giftVariant.price,
        quantity,
        image: giftVariant.product.images[0]?.url ?? null,
        available: giftVariant.stock >= quantity,
      })),
    })),
  };
}
