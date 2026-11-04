import { z } from "zod";

// Les mêmes slugs que ceux des produits (minuscules, chiffres, tirets).
const slug = z.string().trim().regex(/^[a-z0-9-]{1,80}$/);

// Les séries d'une marque : la marque n'existe que dans sa catégorie (« samsung » est
// une marque des Smartphones et une autre des Tablettes), donc les deux sont obligatoires.
export const seriesListQuerySchema = z.object({ category: slug, brand: slug });
export type SeriesListQuery = z.infer<typeof seriesListQuerySchema>;

export const seriesParamsSchema = z.object({ category: slug, brand: slug, serie: slug });
