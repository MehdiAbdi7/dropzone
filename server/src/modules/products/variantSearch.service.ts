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
  if (normalize(hit.sku) === q) return 0;
  return normalize(hit.productName).startsWith(q) ? 1 : 2;
}

// Sans accents ni majuscules : « Écouteurs » devient « ecouteurs ». Le même passage des deux côtés
// (la recherche en JavaScript, le texte de la base par `translate` en SQL) fait qu'on trouve
// « Câble » en tapant « cable ». PostgreSQL n'a pas `unaccent` d'office : on liste les lettres.
const ACCENTED = "àâäçéèêëîïôöùûüÿ";
const PLAIN = "aaaceeeeiioouuuy";
const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

// `%` et `_` sont des jokers de LIKE : on les neutralise pour qu'ils ne cherchent que ces caractères.
const escapeLike = (text: string) => text.replace(/[\\%_]/g, (character) => `\\${character}`);

export async function searchVariants({ q, limit = 20 }: { q: string; limit?: number }): Promise<VariantHit[]> {
  const needle = normalize(q);
  const pattern = `%${escapeLike(needle)}%`;
  // Les variantes qui correspondent (publiées, en stock), choisies en SQL. 500 au plus : une borne
  // large avant le tri de pertinence, qui se fait en JavaScript.
  const matches = await prisma.$queryRaw<{ id: number }[]>`
    SELECT v.id
    FROM product_variants v
    JOIN products p ON p.id = v.product_id
    WHERE v.stock > 0
      AND p.status = 'published'
      AND (
        translate(lower(v.sku), ${ACCENTED}, ${PLAIN}) LIKE ${pattern} ESCAPE '\\'
        OR translate(lower(p.name), ${ACCENTED}, ${PLAIN}) LIKE ${pattern} ESCAPE '\\'
      )
    LIMIT 500`;
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: matches.map((row) => row.id) } },
    include: { product: { select: { name: true, images: { orderBy: { position: "asc" }, take: 1, select: { url: true } } } } },
  });

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
