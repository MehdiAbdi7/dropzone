import { z } from "zod";
import { paginationQuery } from "../../utils/pagination.js";

const slug = z.string().trim().regex(/^[a-z0-9-]{1,120}$/);

// ---------- Public ----------

export const productListQuerySchema = z.object({
  category: slug.optional(),
  q: z.string().trim().min(1).max(100).optional(),
  condition: z.enum(["neuf", "reconditionne"]).optional(),
  model: slug.optional(),
  brand: slug.optional(),
  offre: z.enum(["affaire"]).optional(),
  // `sortie` : du modèle le plus récent au plus ancien (pages des marques de la Boutique).
  sort: z.enum(["nouveautes", "prix-croissant", "prix-decroissant", "sortie"]).default("nouveautes"),
  ...paginationQuery,
}).refine((query) => query.sort !== "sortie" || query.category, {
  // Ce tri lit tout le filtre en mémoire : limité à une catégorie, jamais au catalogue entier.
  message: "Le tri par sortie demande une catégorie",
  path: ["sort"],
});
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const slugParamsSchema = z.object({ slug });

// ---------- Admin ----------

export const idParamsSchema = z.object({ id: z.coerce.number().int().positive() });
export const imageParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  imageId: z.coerce.number().int().positive(),
});

export const adminProductListQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  status: z.enum(["draft", "published"]).optional(),
  category: slug.optional(),
  ...paginationQuery,
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type AdminProductListQuery = z.infer<typeof adminProductListQuerySchema>;

// { "Stockage": "256 Go", "Couleur": "Titane naturel" }
const labelRecord = (valueMax: number) =>
  z
    .record(z.string().trim().min(1).max(40), z.string().trim().min(1).max(valueMax))
    .refine((record) => Object.keys(record).length <= 10, { error: "10 lignes au maximum" });

// Une des trois familles de la fiche d'état : des étiquettes copiées depuis `choices`.
const labelList = z.array(z.string().trim().min(1).max(80)).max(15).default([]);

const variantSchema = z
  .object({
    id: z.number().int().positive().optional(),
    sku: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9-]{3,40}$/, { error: "Majuscules, chiffres et tirets (3 à 40)" }),
    options: labelRecord(60).default({}),
    price: z.number().int().min(0).max(10_000_000),
    stock: z.number().int().min(0).max(10_000),
    condition: z.enum(["new", "refurbished"]).default("new"),
    grade: z.number().int().min(1).max(10).nullable().default(null),
    batteryHealth: z.number().int().min(0).max(100).nullable().default(null),
    replacedParts: labelList,
    defects: labelList,
    limitations: labelList,
    gifts: z
      .array(
        z.object({
          giftVariantId: z.number().int().positive(),
          quantity: z.number().int().min(1).max(5).default(1),
        }),
      )
      .max(5)
      .default([]),
  })
  .superRefine((variant, ctx) => {
    if (variant.condition !== "refurbished") {
      return;
    }
    if (variant.stock > 1) {
      ctx.addIssue({ code: "custom", path: ["stock"], message: "Un reconditionné est unique : stock 0 ou 1" });
    }
    if (variant.grade === null) {
      ctx.addIssue({ code: "custom", path: ["grade"], message: "Note obligatoire pour un reconditionné" });
    }
    if (variant.batteryHealth === null) {
      ctx.addIssue({ code: "custom", path: ["batteryHealth"], message: "Batterie obligatoire pour un reconditionné" });
    }
  });

export const productBodySchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().min(1).max(5000),
    categoryId: z.number().int().positive(),
    deviceModelId: z.number().int().positive().nullable().default(null),
    brandId: z.number().int().positive().nullable().default(null),
    compatibleModelIds: z.array(z.number().int().positive()).max(60).default([]),
    specs: labelRecord(120).default({}),
    status: z.enum(["draft", "published"]).default("draft"),
    variants: z.array(variantSchema).min(1, { error: "Au moins une variante" }).max(60),
  })
  .superRefine((product, ctx) => {
    const skus = product.variants.map((variant) => variant.sku);
    if (new Set(skus).size !== skus.length) {
      ctx.addIssue({ code: "custom", path: ["variants"], message: "Deux variantes ont le même SKU" });
    }
  });
export type ProductBody = z.infer<typeof productBodySchema>;
