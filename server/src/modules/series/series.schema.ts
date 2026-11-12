import { z } from "zod";

// Les mêmes slugs que ceux des produits (minuscules, chiffres, tirets).
const slug = z.string().trim().regex(/^[a-z0-9-]{1,80}$/);

// Les séries d'une marque : la marque n'existe que dans sa catégorie (« samsung » est
// une marque des Smartphones et une autre des Tablettes), donc la catégorie est obligatoire.
// Sans marque (12/11) : toutes les marques de la catégorie, groupées.
export const seriesListQuerySchema = z.object({ category: slug, brand: slug.optional() });
export type SeriesListQuery = z.infer<typeof seriesListQuerySchema>;

export const seriesParamsSchema = z.object({ category: slug, brand: slug, serie: slug });

// ---------- Le back-office ----------

export const seriesBodySchema = z.object({ name: z.string().trim().min(1).max(60) });

// Tous les modèles de la série, dans l'ordre de l'affiche.
export const seriesModelsSchema = z.object({ modelIds: z.array(z.number().int().positive()).max(60) });
