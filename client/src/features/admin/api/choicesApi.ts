import type { ChoiceGroup } from "@/config/catalog";
import { api } from "@/lib/api";
import type { ProductKind } from "@/types/api";
import { data } from "./shared";

// Les listes à cocher du formulaire produit (stockage, couleurs, défauts…) et leurs valeurs.

// `hex` : la teinte d'une couleur (« #f47d3c »), null pour les autres listes et pour une
// couleur qui attend sa teinte.
export type Choice = { id: number; label: string; hex: string | null };
export type ChoiceList = {
  id: number;
  name: string;
  group: ChoiceGroup | null;
  kinds: ProductKind[];
  multiple: boolean;
};
export type Choices = Record<string, Choice[]> & { values: Record<string, Choice[]>; lists: ChoiceList[] };

const choicesApi = api.injectEndpoints({
  endpoints: (build) => ({
    choices: build.query<Choices, void>({
      query: () => "/admin/choices",
      transformResponse: data<Choices>,
      providesTags: ["Choices"],
    }),
    // Une couleur arrive avec sa teinte (`hex`), les autres valeurs sans.
    createChoice: build.mutation<
      Choice,
      ({ group: ChoiceGroup; listId?: never } | { listId: number; group?: never }) & { label: string; hex?: string }
    >({
      query: (body) => ({ url: "/admin/choices", method: "POST", body }),
      transformResponse: data<Choice>,
      invalidatesTags: ["Choices"],
    }),
    updateChoice: build.mutation<Choice, { id: number; label?: string; hex?: string }>({
      query: ({ id, ...body }) => ({ url: `/admin/choices/${id}`, method: "PATCH", body }),
      transformResponse: data<Choice>,
      invalidatesTags: ["Choices"],
    }),
    deleteChoice: build.mutation<void, number>({
      query: (id) => ({ url: `/admin/choices/${id}`, method: "DELETE" }),
      invalidatesTags: ["Choices"],
    }),
    createChoiceList: build.mutation<ChoiceList, { name: string; group?: ChoiceGroup; kinds: ProductKind[]; multiple: boolean }>({
      query: (body) => ({ url: "/admin/choice-lists", method: "POST", body }),
      transformResponse: data<ChoiceList>,
      invalidatesTags: ["Choices"],
    }),
    updateChoiceList: build.mutation<
      ChoiceList,
      { id: number; name?: string; kinds?: ProductKind[]; multiple?: boolean }
    >({
      query: ({ id, ...body }) => ({ url: `/admin/choice-lists/${id}`, method: "PATCH", body }),
      transformResponse: data<ChoiceList>,
      invalidatesTags: ["Choices"],
    }),
    deleteChoiceList: build.mutation<void, number>({
      query: (id) => ({ url: `/admin/choice-lists/${id}`, method: "DELETE" }),
      invalidatesTags: ["Choices"],
    }),
  }),
});

export const {
  useChoicesQuery,
  useCreateChoiceMutation,
  useUpdateChoiceMutation,
  useDeleteChoiceMutation,
  useCreateChoiceListMutation,
  useUpdateChoiceListMutation,
  useDeleteChoiceListMutation,
} = choicesApi;
