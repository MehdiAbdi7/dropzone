import { api } from "@/lib/api";
import type { BrandSeries, Category, SeriesPoster } from "@/types/api";

// Les listes de choix du parcours d'achat, lues à la première ouverture d'une étape (25/11) : le
// client n'en ouvre qu'une ou deux, donc on ne les demande pas à chaque visite d'une page produit.
// Mêmes routes publiques que celles lues par les pages du serveur ; le navigateur passe par /api.
// Les marques et les séries viennent du même appel : toutes les marques d'une catégorie d'un coup.
const journeyApi = api.injectEndpoints({
  endpoints: (build) => ({
    journeyCategories: build.query<Category[], void>({
      query: () => "/categories",
      transformResponse: (body: { data: Category[] }) => body.data,
    }),
    journeyBrands: build.query<BrandSeries[], string>({
      query: (category) => `/series?category=${encodeURIComponent(category)}`,
      transformResponse: (body: { data: BrandSeries[] }) => body.data,
    }),
    journeyModels: build.query<SeriesPoster, { category: string; brand: string; series: string }>({
      query: ({ category, brand, series }) =>
        `/series/${encodeURIComponent(category)}/${encodeURIComponent(brand)}/${encodeURIComponent(series)}`,
      transformResponse: (body: { data: SeriesPoster }) => body.data,
    }),
  }),
});

export const { useLazyJourneyCategoriesQuery, useLazyJourneyBrandsQuery, useLazyJourneyModelsQuery } = journeyApi;
