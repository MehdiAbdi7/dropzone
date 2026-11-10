import { api } from "@/lib/api";
import type { ProductKind } from "@/types/api";
import { data, imageForm } from "./shared";
import type { AdminVariant, ProductBody } from "./productsApi";

// Les pages Couleur du Catalogue (étape Couleur, 05/11) : Catalogue › modèle › couleur.

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

type AdminModelColor = {
  model: AdminColorModel;
  productId: number | null;
  color: { name: string; photoUrl: string | null };
  variants: Omit<AdminVariant, "gifts">[];
};

export type UnitBody = ProductBody["variants"][number] & { color: string };

const colorsApi = api.injectEndpoints({
  endpoints: (build) => ({
    modelColors: build.query<AdminModelColors, number>({
      query: (id) => `/admin/models/${id}/colors`,
      transformResponse: data<AdminModelColors>,
      providesTags: ["Models", "Products"],
    }),
    modelColor: build.query<AdminModelColor, { id: number; color: string }>({
      query: ({ id, color }) => `/admin/models/${id}/colors/${encodeURIComponent(color)}`,
      transformResponse: data<AdminModelColor>,
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
    // Un exemplaire ajouté dans une couleur ; la fiche du modèle est créée si besoin.
    addUnit: build.mutation<{ productId: number; variantId: number }, { id: number; body: UnitBody }>({
      query: ({ id, body }) => ({ url: `/admin/models/${id}/variants`, method: "POST", body }),
      transformResponse: data<{ productId: number; variantId: number }>,
      invalidatesTags: ["Models", "Products", "Series", "Stats"],
    }),
  }),
});

export const {
  useModelColorsQuery,
  useModelColorQuery,
  useUploadColorPhotoMutation,
  useDeleteColorPhotoMutation,
  useAddUnitMutation,
} = colorsApi;
