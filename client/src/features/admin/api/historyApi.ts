import { api } from "@/lib/api";
import type { OrderStatus, OrderType, PaymentMethod } from "@/types/api";
import { data } from "./shared";

// L'historique d'une période (15/11, lot 2) : l'argent à sa date d'encaissement, les ventes et le
// bénéfice à la date de la vente, les caisses, les commandes et les modifications.

export type MovementKind = "sale" | "pickup" | "delivery" | "exchange" | "correction";

export type HistoryDay = {
  date: string;
  collected: number;
  byMethod: Record<PaymentMethod, number>;
  // La caisse de ce jour-là, si elle a été ouverte ; gap : compté − attendu (négatif = il manque).
  cashDay: { openingFloat: number; countedCash: number | null; gap: number | null; closed: boolean } | null;
};

export type HistoryOrder = {
  id: number;
  number: number;
  dailyNumber: number;
  businessDate: string;
  type: OrderType;
  status: OrderStatus;
  fullName: string;
  phone: string;
  total: number;
  paid: number;
  cashedOn: string[];
  // Le jour de la vente (premier paiement) ; null tant que rien n'est encaissé.
  saleDate: string | null;
  // null : pas encore vendue, ou prix d'achat inconnu sur une ligne.
  profit: number | null;
  // La réduction accordée sur la commande (lot 3) : 0 sans prix catalogue connu.
  discount: number;
};

export type History = {
  from: string;
  to: string;
  totals: {
    collected: number;
    byMethod: Record<PaymentMethod, number>;
    byKind: Record<MovementKind, number>;
    salesCount: number;
    profit: number;
    unknownCostSales: number;
    // Les réductions accordées sur les ventes de la période (lot 3).
    discount: number;
  };
  days: HistoryDay[];
  orders: HistoryOrder[];
  ordersTruncated: boolean;
  changes: {
    id: number;
    createdAt: string;
    kind: "edited" | "deleted";
    orderNumber: number;
    orderId: number | null;
    summary: string;
    userName: string | null;
  }[];
};

export type HistoryParams = { from: string; to: string; type?: OrderType; q?: string };

const historyApi = api.injectEndpoints({
  endpoints: (build) => ({
    history: build.query<History, HistoryParams>({
      query: (params) => ({ url: "/admin/history", params }),
      transformResponse: data<History>,
      providesTags: ["History"],
    }),
  }),
});

export const { useHistoryQuery } = historyApi;
