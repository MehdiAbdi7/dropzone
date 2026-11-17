import { api } from "@/lib/api";
import type { Palette } from "@/config/colors";
import type { BrandSeries, Category, SeriesPoster } from "@/types/api";
import { data } from "./shared";

// Les lectures PUBLIQUES de la boutique, relues côté navigateur par la fenêtre de recherche du
// comptoir (18/11) : le vendeur parcourt les mêmes catégories, marques, séries et modèles que le
// client sur le site. Ce sont les mêmes routes que celles des pages de la boutique.
const shopPickerApi = api.injectEndpoints({
  endpoints: (build) => ({
    shopCategories: build.query<Category[], void>({ query: () => "/categories", transformResponse: data }),
    shopSeries: build.query<BrandSeries[], string>({
      query: (category) => ({ url: "/series", params: { category } }),
      transformResponse: data,
    }),
    shopPoster: build.query<SeriesPoster, { category: string; brand: string; series: string }>({
      query: ({ category, brand, series }) => `/series/${category}/${brand}/${series}`,
      transformResponse: data,
    }),
    shopColors: build.query<Palette, void>({ query: () => "/colors", transformResponse: data }),
  }),
});

export const { useShopCategoriesQuery, useShopSeriesQuery, useShopPosterQuery, useShopColorsQuery } = shopPickerApi;
