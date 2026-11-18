import { api } from "@/lib/api";
import { data } from "./shared";

// Les pièces de l'atelier (18/11, étape 1) : la liste, la création, les arrivages, les corrections de stock et
// le journal d'une pièce. Réservé à l'admin (aucune route dans la table des droits).

export type PartRow = {
  id: number;
  name: string;
  // Le prix d'achat moyen : recalculé à chaque arrivage.
  purchasePrice: number;
  salePrice: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
};

export type PartMovementRow = {
  id: number;
  createdAt: string;
  kind: "arrival" | "correction" | "repair" | "repair_return";
  delta: number;
  unitCost: number | null;
  stockAfter: number;
  note: string | null;
  userId: number | null;
};

export type PartBody = { name: string; purchasePrice: number; salePrice: number; stock?: number };
export type PartPatchBody = { name?: string; purchasePrice?: number; salePrice?: number };

const partsApi = api.injectEndpoints({
  endpoints: (build) => ({
    // `q` : un morceau du nom, sans tenir compte des accents ni de la casse.
    parts: build.query<PartRow[], string>({
      query: (q) => ({ url: "/admin/parts", params: { q } }),
      transformResponse: data<PartRow[]>,
      providesTags: ["Parts"],
    }),
    createPart: build.mutation<PartRow, PartBody>({
      query: (body) => ({ url: "/admin/parts", method: "POST", body }),
      transformResponse: data<PartRow>,
      invalidatesTags: ["Parts"],
    }),
    updatePart: build.mutation<PartRow, { id: number; body: PartPatchBody }>({
      query: ({ id, body }) => ({ url: `/admin/parts/${id}`, method: "PATCH", body }),
      transformResponse: data<PartRow>,
      invalidatesTags: ["Parts"],
    }),
    addArrival: build.mutation<PartRow, { id: number; quantity: number; unitCost: number }>({
      query: ({ id, ...body }) => ({ url: `/admin/parts/${id}/arrivals`, method: "POST", body }),
      transformResponse: data<PartRow>,
      invalidatesTags: ["Parts"],
    }),
    correctStock: build.mutation<PartRow, { id: number; stock: number; note?: string }>({
      query: ({ id, ...body }) => ({ url: `/admin/parts/${id}/corrections`, method: "POST", body }),
      transformResponse: data<PartRow>,
      invalidatesTags: ["Parts"],
    }),
    // Le journal d'une pièce : relu après chaque arrivage ou correction (même étiquette que la liste).
    partMovements: build.query<PartMovementRow[], number>({
      query: (id) => `/admin/parts/${id}/movements`,
      transformResponse: data<PartMovementRow[]>,
      providesTags: ["Parts"],
    }),
  }),
});

export const {
  usePartsQuery,
  useCreatePartMutation,
  useUpdatePartMutation,
  useAddArrivalMutation,
  useCorrectStockMutation,
  usePartMovementsQuery,
} = partsApi;
