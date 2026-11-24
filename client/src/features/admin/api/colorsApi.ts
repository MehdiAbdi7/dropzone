import { api } from "@/lib/api";
import type { ProductKind } from "@/types/api";
import { data, imageForm } from "./shared";

// Les couleurs d'un modèle (étape Couleur, 05/11) : leurs photos et leur stock, lus par la fiche produit (depuis le 24/11,
// qui a remplacé les pages Catalogue › modèle › couleur).

type AdminColorModel = {
  id: number;
  brand: string;
  name: string;
  kind: ProductKind;
  series: { id: number; name: string } | null;
};

type AdminModelColors = {
  model: AdminColorModel;
  // La fiche du modèle ; null tant qu'aucun exemplaire n'a été ajouté.
  productId: number | null;
  colors: { name: string; photoUrl: string | null; newStock: number; refurbishedCount: number }[];
};

const colorsApi = api.injectEndpoints({
  endpoints: (build) => ({
    modelColors: build.query<AdminModelColors, number>({
      query: (id) => `/admin/models/${id}/colors`,
      transformResponse: data<AdminModelColors>,
      providesTags: ["Models", "Products"],
    }),
    uploadColorPhoto: build.mutation<unknown, { id: number; color: string; file: File }>({
      query: ({ id, color, file }) => ({
        url: `/admin/models/${id}/colors/${encodeURIComponent(color)}/photo`,
        method: "POST",
        body: imageForm(file),
      }),
      invalidatesTags: ["Models"],
    }),
    deleteColorPhoto: build.mutation<void, { id: number; color: string }>({
      query: ({ id, color }) => ({ url: `/admin/models/${id}/colors/${encodeURIComponent(color)}/photo`, method: "DELETE" }),
      invalidatesTags: ["Models"],
    }),
  }),
});

export const {
  useModelColorsQuery,
  useUploadColorPhotoMutation,
  useDeleteColorPhotoMutation,
} = colorsApi;
