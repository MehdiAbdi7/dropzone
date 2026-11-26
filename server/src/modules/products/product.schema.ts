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

// Les médias d'une variante (26/11) : l'adresse d'un média, et la liste dans l'ordre voulu (8 photos et 1 vidéo au plus).
export const mediaParamsSchema = idParamsSchema.extend({ mediaId: z.coerce.number().int().positive() });
export const mediaOrderBodySchema = z.object({ ids: z.array(z.number().int().positive()).max(9) });
// Une vidéo envoyée directement chez Cloudinary : le navigateur donne son identifiant (le reste vient de Cloudinary).
export const registerVideoBodySchema = z.object({ publicId: z.string().min(1).max(200) });

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

// La recherche de variantes du comptoir (16/11, lot 3, refaite le 17/11) : des mots (vide ou de 2 à
// 60 caractères : vide = tout parcourir), filtrable par catégorie et par état, 50 résultats par
// défaut et 200 au plus (la réponse dit aussi combien il y en a en tout).
export const variantSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(60)
    .refine((text) => text === "" || text.length >= 2, { error: "Au moins 2 caractères" })
    .default(""),
  category: z.string().trim().min(1).max(60).optional(),
  condition: z.enum(["new", "refurbished"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type VariantSearchQuery = z.infer<typeof variantSearchQuerySchema>;

// { "Stockage": "256 Go", "Couleur": "Titane naturel" }
export const labelRecord = (valueMax: number) =>
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

// Les champs de la fiche d'état d'une affaire : ceux de la variante d'un appareil reconditionné et ceux
// d'une reprise (lot 5, `tradeInSheetSchema`), qui deviendra cette variante. Une seule définition.
export const sheetFields = {
  grade: z.number().int().min(1).max(10).nullable().default(null),
  batteryHealth: z.number().int().min(0).max(100).nullable().default(null),
  replacedParts: labelList,
  // Les pièces changées qui ne sont pas d'origine.
  compatibleParts: labelList,
  defects: labelList,
  limitations: labelList,
  // Avec ou sans sa boîte d'origine : obligatoire pour une affaire (voir checkRefurbishedSheet).
  // « Non précisée » (null) n'existe que pour les annonces importées : le gérant choisit.
  withBox: z.boolean().nullable().default(null),
  // Les détails du gérant ; des détails vides sont rangés comme « pas de détails ».
  details: optionalText(200),
  // La garantie en mois : obligatoire pour un appareil (règle du service, qui connaît la catégorie).
  warrantyMonths: z.number().int().min(1).max(36).nullable().default(null),
  // Le pays d'origine, une valeur de la liste « Pays d'origine ».
  origin: optionalText(40),
};

// Les règles d'une affaire : la boîte est dite, et une pièce compatible est une pièce changée.
// La note et la batterie sont facultatives : les annonces de PC n'en donnent presque jamais, et la
// boutique dit alors « non précisée » plutôt que d'inventer.
export function checkRefurbishedSheet(
  sheet: { withBox: boolean | null; compatibleParts: string[]; replacedParts: string[] },
  ctx: z.RefinementCtx,
) {
  if (sheet.withBox === null) {
    ctx.addIssue({ code: "custom", path: ["withBox"], message: "Dites si l'occasion a sa boîte d'origine" });
  }
  if (sheet.compatibleParts.some((part) => !sheet.replacedParts.includes(part))) {
    ctx.addIssue({
      code: "custom",
      path: ["compatibleParts"],
      message: "Une pièce compatible doit être une pièce changée",
    });
  }
}

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
    // Brouillon ou publiée (23/11) : sans statut, une variante est publiée (anciens envois, imports).
    status: z.enum(["draft", "published"]).default("published"),
    condition: z.enum(["new", "refurbished"]).default("new"),
    ...sheetFields,
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
    checkRefurbishedSheet(variant, ctx);
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
    // Le produit est toujours visible depuis le 23/11 : le brouillon se règle sur chaque variante. Le champ reste
    // accepté pour un ancien front pas encore déployé.
    status: z.enum(["draft", "published"]).default("published"),
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
