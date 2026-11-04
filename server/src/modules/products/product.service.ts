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
  compatibleParts: string[];
  defects: string[];
  limitations: string[];
  withBox: boolean | null;
  details: string | null;
};

// La fiche d'une affaire en une ligne, recopiée dans la commande pour que le client et
// le magasin sachent ce qui a été vendu : « Note 9/10 · Batterie 87 % · Remplacé :
// Batterie (d'origine), Écran (compatible) · Défauts : aucun · Limitations : aucune ·
// Sans boîte », puis « · Détails : … » s'il y en a. Un neuf scellé n'a rien.
export function buildConditionReport(variant: ConditionFields): string | null {
  if (variant.condition === "new") {
    return null;
  }
  const list = (items: string[], empty: string) => (items.length > 0 ? items.join(", ") : empty);
  const replaced = variant.replacedParts.map(
    (part) => `${part} (${variant.compatibleParts.includes(part) ? "compatible" : "d'origine"})`,
  );
  return [
    `Note ${variant.grade}/10`,
    `Batterie ${variant.batteryHealth} %`,
    `Remplacé : ${list(replaced, "rien")}`,
    `Défauts : ${list(variant.defects, "aucun")}`,
    `Limitations : ${list(variant.limitations, "aucune")}`,
    variant.withBox ? "Avec sa boîte d'origine" : "Sans boîte",
    ...(variant.details ? [`Détails : ${variant.details}`] : []),
  ].join(" · ");
}

// `sortie` n'est pas ici : il se trie en JavaScript (voir byRelease).
const SORTS: Record<Exclude<ProductListQuery["sort"], "sortie">, Prisma.ProductOrderByWithRelationInput[]> = {
  nouveautes: [{ createdAt: "desc" }, { id: "desc" }],
  "prix-croissant": [{ minPrice: "asc" }, { id: "asc" }],
  "prix-decroissant": [{ minPrice: "desc" }, { id: "desc" }],
};

// Le prix le plus bas parmi les variantes en stock d'un état, ou null s'il n'y en a pas.
export function lowestInStock(variants: { price: number; stock: number }[]): number | null {
  const inStock = variants.filter((variant) => variant.stock > 0);
  return inStock.length > 0 ? Math.min(...inStock.map((variant) => variant.price)) : null;
}

const RELEASE_SORT_MAX = 500;

type ReleaseSortable = { id: number; deviceModel: { releaseYear: number | null } | null; variants: { price: number }[] };

// Du modèle le plus récent au plus ancien (sans année à la fin), puis, la même année, le
// plus cher d'abord. « Le plus cher » = la variante la plus chère, même épuisée : le prix
// « dès » ferait passer un Pro Max qui a un reconditionné bon marché derrière un modèle
// d'entrée de gamme. Prisma ne trie pas sur le maximum d'une relation, d'où ce tri ici.
function byRelease(a: ReleaseSortable, b: ReleaseSortable): number {
  const yearA = a.deviceModel?.releaseYear ?? -Infinity;
  const yearB = b.deviceModel?.releaseYear ?? -Infinity;
  const highest = (product: ReleaseSortable) => Math.max(0, ...product.variants.map((variant) => variant.price));
  return yearB - yearA || highest(b) - highest(a) || b.id - a.id;
}

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
        { brand: { name: { contains, mode: "insensitive" } } },
      ],
    });
  }
  if (query.brand === "autres") {
    // La carte « Autres » de la Boutique : les produits sans marque (de la catégorie choisie).
    filters.push({ brandId: null });
  } else if (query.brand) {
    // Avec `category`, c'est la marque de cette catégorie (les deux filtres s'ajoutent).
    filters.push({ brand: { slug: query.brand } });
  }
  if (query.condition) {
    // « affaire » est le mot du magasin ; « reconditionne », l'ancien, reste accepté.
    const condition: Condition = query.condition === "neuf" ? "new" : "refurbished";
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
  const where: Prisma.ProductWhereInput = { status: "published", AND: filters };
  const select = {
    id: true,
    name: true,
    slug: true,
    minPrice: true,
    category: { select: { name: true, slug: true } },
    deviceModel: { select: { brand: true, releaseYear: true } },
    brand: { select: { name: true } },
    images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
    variants: { select: { condition: true, price: true, stock: true } },
  } satisfies Prisma.ProductSelect;

  let total: number;
  let products: Prisma.ProductGetPayload<{ select: typeof select }>[];
  if (query.sort === "sortie") {
    // Tri en JavaScript : on lit tout le filtre (une catégorie, imposée par le schéma, et
    // au plus RELEASE_SORT_MAX produits pour que la lecture reste bornée), on trie, puis on
    // découpe la page.
    const all = (await prisma.product.findMany({ where, select, take: RELEASE_SORT_MAX })).sort(byRelease);
    const { skip, take } = paginate(query.page, query.limit);
    total = all.length;
    products = all.slice(skip, skip + take);
  } else {
    [total, products] = await prisma.$transaction([
      prisma.product.count({ where }),
      prisma.product.findMany({ where, orderBy: SORTS[query.sort], ...paginate(query.page, query.limit), select }),
    ]);
  }

  const data = products.map(({ variants, images, deviceModel, brand, ...product }) => {
    const available = variants.filter((variant) => variant.stock > 0);
    const fresh = variants.filter((variant) => variant.condition === "new");
    const refurbished = variants.filter((variant) => variant.condition === "refurbished");
    return {
      ...product,
      // La petite ligne de la carte : le fabricant du modèle (« Apple » au-dessus
      // d'« iPhone 15 », pas « iPhone » deux fois), sinon le nom de la marque.
      brand: deviceModel?.brand ?? brand?.name ?? null,
      image: images[0]?.url ?? null,
      inStock: available.length > 0,
      hasNew: available.some((variant) => variant.condition === "new"),
      hasRefurbished: available.some((variant) => variant.condition === "refurbished"),
      // Les deux lignes de prix de la carte d'un modèle, et les chiffres de l'étape « neuf ou reconditionné ».
      newFrom: lowestInStock(fresh),
      refurbishedFrom: lowestInStock(refurbished),
      newStock: fresh.reduce((sum, variant) => sum + variant.stock, 0),
      refurbishedCount: refurbished.filter((variant) => variant.stock > 0).length,
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
      // La marque de la Boutique (« iPhone »), pour le fil d'Ariane ; null = carte « Autres ».
      brand: { select: { name: true, slug: true } },
      // La série du modèle, pour le fil d'Ariane (Boutique › … › iPhone 18 › iPhone 18 Pro Max).
      deviceModel: { select: { brand: true, name: true, slug: true, series: { select: { name: true, slug: true } } } },
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
          compatibleParts: true,
          withBox: true,
          details: true,
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

  const { series = null, ...deviceModel } = product.deviceModel ?? {};
  return {
    ...product,
    deviceModel: product.deviceModel ? deviceModel : null,
    series,
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
