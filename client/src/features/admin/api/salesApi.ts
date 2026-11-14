import { api } from "@/lib/api";
import type { OrderStatus, PaymentMethod } from "@/types/api";
import { data } from "./shared";
import type { VariantHit } from "../sales/ticket";

// La vente au magasin (16/11, lot 3) : chercher une variante, encaisser le ticket.

export type SaleBody = {
  fullName: string;
  phone: string;
  method: PaymentMethod;
  note?: string;
  acceptLimitations: boolean;
  // `unitPrice` : le prix accordé, seulement quand il a été négocié ; absent, le serveur prend le catalogue.
  lines: { sku: string; quantity: number; unitPrice?: number }[];
};

// `notices` : les mises en garde du calcul du ticket, par exemple un cadeau épuisé qui n'a pas été offert.
export type SaleDone = {
  id: number;
  number: number;
  dailyNumber: number;
  total: number;
  status: OrderStatus;
  notices: string[];
};

export type VariantSearchArgs = { q: string; category?: string; condition?: "new" | "refurbished"; limit: number };
export type VariantSearchResult = { hits: VariantHit[]; total: number };

const salesApi = api.injectEndpoints({
  endpoints: (build) => ({
    // Des mots (ou rien pour tout parcourir), filtrés par catégorie et par état. `total` : combien de
    // variantes correspondent en tout, `hits` n'en montre que `limit`.
    searchVariants: build.query<VariantSearchResult, VariantSearchArgs>({
      query: ({ q, category, condition, limit }) => ({
        url: "/admin/variants",
        params: { q, category, condition, limit },
      }),
      transformResponse: (body: { data: VariantHit[]; meta: { total: number } }): VariantSearchResult => ({
        hits: body.data,
        total: body.meta.total,
      }),
      // Une vente ou une modification change le stock : la recherche se relit (sinon l'appareil vendu
      // resterait « 1 en stock » pendant une minute).
      providesTags: ["Products"],
    }),
    // Une vente change le stock, la caisse, l'accueil et l'historique.
    createSale: build.mutation<SaleDone, SaleBody>({
      query: (body) => ({ url: "/admin/sales", method: "POST", body }),
      transformResponse: data<SaleDone>,
      invalidatesTags: ["Orders", "Stats", "Cash", "Products", "History"],
    }),
  }),
});

export const { useSearchVariantsQuery, useCreateSaleMutation } = salesApi;
