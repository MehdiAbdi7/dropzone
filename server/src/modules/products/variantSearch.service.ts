import { prisma } from "../../config/db.js";
import type { Condition, Prisma } from "../../generated/prisma/client.js";
import { buildConditionReport } from "./product.service.js";

// Le sélecteur de variantes du comptoir (16/11, lot 3) : le vendeur tape un morceau du nom ou un
// SKU et choisit l'appareil exact. N'offre que ce qui se vend (produit publié, en stock) et ne
// montre jamais le prix d'achat.
export type VariantHit = {
  sku: string;
  productName: string;
  options: Prisma.JsonValue;
  condition: Condition;
  price: number;
  stock: number;
  conditionReport: string | null;
  image: string | null;
};

// 0 : le SKU exact ; 1 : un nom qui commence par la recherche ; 2 : le reste.
function rank(hit: { sku: string; productName: string }, q: string): number {
  if (hit.sku.toLowerCase() === q) return 0;
  return hit.productName.toLowerCase().startsWith(q) ? 1 : 2;
}

export async function searchVariants({ q, limit = 20 }: { q: string; limit?: number }): Promise<VariantHit[]> {
  const variants = await prisma.productVariant.findMany({
    where: {
      stock: { gt: 0 },
      product: { status: "published" },
      OR: [
        { sku: { contains: q, mode: "insensitive" } },
        { product: { name: { contains: q, mode: "insensitive" } } },
      ],
    },
    include: { product: { select: { name: true, images: { orderBy: { position: "asc" }, take: 1, select: { url: true } } } } },
    // Une borne large avant le tri : le tri de pertinence se fait en JavaScript.
    take: 200,
  });

  const needle = q.toLowerCase();
  return variants
    .map((variant) => ({
      sku: variant.sku,
      productName: variant.product.name,
      options: variant.options,
      condition: variant.condition,
      price: variant.price,
      stock: variant.stock,
      conditionReport: buildConditionReport(variant),
      image: variant.product.images[0]?.url ?? null,
    }))
    .sort((a, b) => rank(a, needle) - rank(b, needle) || a.productName.localeCompare(b.productName) || a.price - b.price)
    .slice(0, limit);
}
