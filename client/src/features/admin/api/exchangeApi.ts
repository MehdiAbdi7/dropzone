import { api } from "@/lib/api";
import type { OrderStatus, ProductKind } from "@/types/api";
import { data } from "./shared";
import type { buildExchangeBody } from "../exchange/exchange";
import type { buildTradeInUpdateBody } from "../exchange/tradeInView";

// Les échanges (lot 5) : valider un échange au comptoir, lister les reprises, les mettre en vente.

export type ExchangeBody = ReturnType<typeof buildExchangeBody>;

// `difference` : ce que le client a payé en plus (positif) ou ce que le magasin lui a rendu (négatif).
export type ExchangeDone = {
  id: number;
  number: number;
  dailyNumber: number;
  total: number;
  status: OrderStatus;
  difference: number;
  tradeInId: number;
  notices: string[];
};

// Une reprise : le téléphone du client, au prix que le magasin lui a donné.
export type TradeInRow = {
  id: number;
  orderId: number;
  orderNumber: number;
  dailyNumber: number;
  businessDate: string;
  customerName: string;
  customerPhone: string;
  deviceModel: { id: number; brand: string; name: string; kind: ProductKind };
  color: string;
  price: number;
  // Ce que la remise en état a coûté (batterie neuve…) : il s'ajoute au prix d'achat de l'affaire (18/11).
  repairCost: number;
  // La fiche d'état saisie à l'échange (note, batterie, pièces, défauts, boîte, garantie, origine…).
  sheet: {
    options?: Record<string, string>;
    grade?: number | null;
    batteryHealth?: number | null;
    replacedParts?: string[];
    compatibleParts?: string[];
    defects?: string[];
    limitations?: string[];
    withBox?: boolean | null;
    details?: string | null;
    warrantyMonths?: number | null;
    origin?: string | null;
  };
  createdAt: string;
  listedAt: string | null;
  listedVariantId: number | null;
};

export type TradeInStatus = "pending" | "listed";

const exchangeApi = api.injectEndpoints({
  endpoints: (build) => ({
    // Un échange change le stock, la caisse, l'accueil, l'historique et la liste des reprises.
    createExchange: build.mutation<ExchangeDone, ExchangeBody>({
      query: (body) => ({ url: "/admin/exchanges", method: "POST", body }),
      transformResponse: data<ExchangeDone>,
      invalidatesTags: ["Orders", "Stats", "Cash", "Products", "History", "TradeIns"],
    }),
    // Les reprises à mettre en vente (par défaut) ou déjà en vente.
    tradeIns: build.query<TradeInRow[], TradeInStatus>({
      query: (status) => ({ url: "/admin/trade-ins", params: { status } }),
      transformResponse: data<TradeInRow[]>,
      providesTags: ["TradeIns"],
    }),
    // Modifier la fiche d'une reprise avant sa mise en vente : batterie remplacée, pièces, défauts, frais.
    updateTradeIn: build.mutation<{ id: number }, { id: number; body: ReturnType<typeof buildTradeInUpdateBody> }>({
      query: ({ id, body }) => ({ url: `/admin/trade-ins/${id}`, method: "PATCH", body }),
      transformResponse: data<{ id: number }>,
      invalidatesTags: ["TradeIns"],
    }),
    // Mettre en vente : le prix de revente, fixé par l'admin. L'affaire entre dans la fiche du modèle.
    publishTradeIn: build.mutation<{ id: number; productId: number; variantId: number; sku: string }, { id: number; price: number }>({
      query: ({ id, price }) => ({ url: `/admin/trade-ins/${id}/publish`, method: "POST", body: { price } }),
      transformResponse: data<{ id: number; productId: number; variantId: number; sku: string }>,
      invalidatesTags: ["TradeIns", "Products", "Stats"],
    }),
  }),
});

export const { useCreateExchangeMutation, useTradeInsQuery, usePublishTradeInMutation, useUpdateTradeInMutation } = exchangeApi;
