import { api } from "@/lib/api";
import type { ProductDetail } from "@/types/api";

// La fiche d'un accessoire, lue par sa fenêtre à l'ouverture (refonte du 12/11) : ses variantes,
// leurs prix, leur stock et, pour un verre, les téléphones de chaque taille.
const accessoriesApi = api.injectEndpoints({
  endpoints: (build) => ({
    accessoryDetail: build.query<ProductDetail, string>({
      query: (slug) => `/products/${encodeURIComponent(slug)}`,
      transformResponse: (body: { data: ProductDetail }) => body.data,
    }),
  }),
});

export const { useAccessoryDetailQuery } = accessoriesApi;
