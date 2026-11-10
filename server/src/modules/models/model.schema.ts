import { z } from "zod";

// Les modèles d'appareils (« Apple iPhone 15 Pro Max ») proposés dans le formulaire produit.
const deviceKind = z.enum(["phone", "tablet", "laptop", "watch"]);

export const modelListQuerySchema = z.object({
  kind: deviceKind.optional(),
  q: z.string().trim().min(1).max(60).optional(),
});
export type ModelListQuery = z.infer<typeof modelListQuerySchema>;

// L'année de sortie range les modèles dans la Boutique : obligatoire pour un nouveau modèle.
const releaseYear = z.number().int().min(2000).max(2100);
export const modelBodySchema = z.object({
  brand: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(80),
  kind: deviceKind,
  releaseYear,
});
export type ModelBody = z.infer<typeof modelBodySchema>;

// Corriger l'année, les couleurs officielles du modèle (pastilles de l'affiche), ou choisir
// la lueur parmi elles (null = la première couleur officielle).
const colorName = z.string().trim().min(1).max(40);
export const modelPatchSchema = z
  .object({
    releaseYear: releaseYear.optional(),
    colors: z.array(colorName).max(20).optional(),
    posterColor: colorName.nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { error: "Rien à modifier" });
export type ModelPatch = z.infer<typeof modelPatchSchema>;
