import { z } from "zod";
import { idParamsSchema } from "../../utils/idParams.js";
import { paginationQuery } from "../../utils/pagination.js";

const slug = z.string().trim().regex(/^[a-z0-9-]{1,120}$/);

// La référence interne du magasin (« 51057 ») : lettres, chiffres et tirets, 20 au plus.
// Exportée pour l'import des annonces, qui doit refuser ce que le back-office refuserait.
export const REFERENCE_PATTERN = /^[A-Z0-9-]{1,20}$/i;

// ---------- Public ----------

export const productListQuerySchema = z.object({
  category: z.union([slug, z.array(slug).min(1).max(6)]).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  // « affaire » est le mot du magasin ; « reconditionne » reste accepté (anciens liens).
  condition: z.enum(["neuf", "affaire", "reconditionne"]).optional(),
  model: slug.optional(),
  brand: slug.optional(),
  // « complete » : seulement les produits qui ont une affaire en stock dont la fiche dit la
  // note et la batterie (la vitrine de l'accueil ; une annonce importée n'en dit souvent rien).
  fiche: z.enum(["complete"]).optional(),
  // Les derniers arrivages de l'accueil (12/11) : seulement les appareils (`appareils=1`), et
  // seulement les articles (variantes) en stock (`enstock=1`).
  appareils: z.enum(["1"]).optional(),
  enstock: z.enum(["1"]).optional(),
  // `sortie` : du modèle le plus récent au plus ancien (pages des marques de la Boutique).
  // `arrivages` : du dernier arrivage au plus ancien (nouvel exemplaire ou stock ajouté, 12/11).
  sort: z.enum(["nouveautes", "prix-croissant", "prix-decroissant", "sortie", "arrivages"]).default("nouveautes"),
  ...paginationQuery,
}).refine((query) => query.sort !== "sortie" || query.category, {
  // Ce tri lit tout le filtre en mémoire : limité à une catégorie, jamais au catalogue entier.
  message: "Le tri par sortie demande une catégorie",
  path: ["sort"],
});
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const slugParamsSchema = z.object({ slug });

// ---------- Admin ----------

export const imageParamsSchema = idParamsSchema.extend({ imageId: z.coerce.number().int().positive() });

export const adminProductListQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  status: z.enum(["draft", "published"]).optional(),
  category: slug.optional(),
  sort: z.enum(["recent", "name-asc", "name-desc", "price-asc", "price-desc"]).default("recent"),
  // Les produits d'une marque, ou d'un type d'accessoires (page d'un type du Catalogue).
  brand: z.coerce.number().int().positive().optional(),
  ...paginationQuery,
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type AdminProductListQuery = z.infer<typeof adminProductListQuerySchema>;

// La recherche de variantes du comptoir (16/11, lot 3) : de 2 à 60 caractères, 20 résultats au plus.
export const variantSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(60),
  limit: z.coerce.number().int().min(1).max(20).default(20),
});
export type VariantSearchQuery = z.infer<typeof variantSearchQuerySchema>;

// { "Stockage": "256 Go", "Couleur": "Titane naturel" }
const labelRecord = (valueMax: number) =>
  z
    .record(z.string().trim().min(1).max(40), z.string().trim().min(1).max(valueMax))
    .refine((record) => Object.keys(record).length <= 10, { error: "10 lignes au maximum" });

// Une des trois familles de la fiche d'état : des étiquettes copiées depuis `choices`.
const labelList = z.array(z.string().trim().min(1).max(80)).max(15).default([]);

// Un texte facultatif du formulaire : un champ vide est rangé comme « rien » (null).
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((text) => text || null)
    .nullable()
    .default(null);

export const variantSchema = z
  .object({
    id: z.number().int().positive().optional(),
    sku: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9-]{3,40}$/, { error: "Majuscules, chiffres et tirets (3 à 40)" }),
    options: labelRecord(60).default({}),
    price: z.number().int().min(0).max(10_000_000),
    // Le prix d'achat du magasin (14/11), facultatif, jamais montré sur le site.
    purchasePrice: z.number().int().min(0).max(10_000_000).nullable().default(null),
    stock: z.number().int().min(0).max(10_000),
    condition: z.enum(["new", "refurbished"]).default("new"),
    grade: z.number().int().min(1).max(10).nullable().default(null),
    batteryHealth: z.number().int().min(0).max(100).nullable().default(null),
    replacedParts: labelList,
    // Les pièces changées qui ne sont pas d'origine.
    compatibleParts: labelList,
    defects: labelList,
    limitations: labelList,
    // Avec ou sans sa boîte d'origine : obligatoire pour une affaire (voir plus bas).
    // « Non précisée » (null) n'existe que pour les annonces importées : le gérant choisit.
    withBox: z.boolean().nullable().default(null),
    // Les détails du gérant ; des détails vides sont rangés comme « pas de détails ».
    details: optionalText(200),
    // La garantie en mois : obligatoire pour un appareil (règle du service, qui connaît la catégorie).
    warrantyMonths: z.number().int().min(1).max(36).nullable().default(null),
    // Le pays d'origine, une valeur de la liste « Pays d'origine ».
    origin: optionalText(40),
    // La référence interne du magasin (« 51057 »), unique quand elle existe.
    reference: optionalText(20)
      .refine((reference) => reference === null || REFERENCE_PATTERN.test(reference), {
        error: "Lettres, chiffres et tirets",
      })
      .transform((reference) => reference?.toUpperCase() ?? null),
    gifts: z
      .array(
        z.object({
          giftVariantId: z.number().int().positive(),
          quantity: z.number().int().min(1).max(5).default(1),
        }),
      )
      .max(5)
      .default([]),
    // Les téléphones sur lesquels va la variante d'un accessoire (une taille de verre, 12/11).
    compatibleModelIds: z.array(z.number().int().positive()).max(60).default([]),
  })
  .superRefine((variant, ctx) => {
    // Un neuf scellé n'a rien à décrire ; ses articles offerts restent permis.
    if (variant.condition !== "refurbished") {
      if (variant.details) {
        ctx.addIssue({ code: "custom", path: ["details"], message: "Un neuf scellé n'a pas de détails" });
      }
      return;
    }
    if (variant.withBox === null) {
      ctx.addIssue({ code: "custom", path: ["withBox"], message: "Dites si l'affaire a sa boîte d'origine" });
    }
    if (variant.compatibleParts.some((part) => !variant.replacedParts.includes(part))) {
      ctx.addIssue({
        code: "custom",
        path: ["compatibleParts"],
        message: "Une pièce compatible doit être une pièce changée",
      });
    }
    // La note et la batterie sont facultatives : les annonces de PC n'en donnent
    // presque jamais, et la boutique dit alors « non précisée » plutôt que d'inventer.
  });

export const productBodySchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().min(1).max(5000),
    categoryId: z.number().int().positive(),
    deviceModelId: z.number().int().positive().nullable().default(null),
    brandId: z.number().int().positive().nullable().default(null),
    // Un accessoire : sa marque dans son type (la marque du produit, `brandId`, est le type).
    makerId: z.number().int().positive().nullable().default(null),
    // Un verre incassable va sur tous les téléphones du catalogue (une taille chacun) : 150 au plus.
    compatibleModelIds: z.array(z.number().int().positive()).max(150).default([]),
    specs: labelRecord(120).default({}),
    status: z.enum(["draft", "published"]).default("draft"),
    // La coque MagSafe iPhone a 81 variantes (27 modèles × 3 couleurs, refonte du 12/11).
    variants: z.array(variantSchema).min(1, { error: "Au moins une variante" }).max(120),
  })
  .superRefine((product, ctx) => {
    const skus = product.variants.map((variant) => variant.sku);
    if (new Set(skus).size !== skus.length) {
      ctx.addIssue({ code: "custom", path: ["variants"], message: "Deux variantes ont le même SKU" });
    }
    const references = product.variants.flatMap((variant) => (variant.reference ? [variant.reference] : []));
    if (new Set(references).size !== references.length) {
      ctx.addIssue({ code: "custom", path: ["variants"], message: "Deux variantes ont la même référence" });
    }
  });
export type ProductBody = z.infer<typeof productBodySchema>;
