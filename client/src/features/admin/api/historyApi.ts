import { api } from "@/lib/api";
import type { OrderStatus, OrderType, PaymentMethod } from "@/types/api";
import { data } from "./shared";

// L'historique d'une période (15/11, lot 2) : l'argent à sa date d'encaissement, les ventes et le
// bénéfice à la date de la vente, les caisses, les commandes et les modifications.

export type MovementKind = "sale" | "pickup" | "delivery" | "exchange" | "correction" | "return_fee" | "repair";

// Un canal de l'historique : un type de commande, ou « repair » (les réparations rendues, atelier étape 3).
export type HistoryChannelType = OrderType | "repair";

// Une réparation rendue de la période : ce que le client a payé, ce que les pièces ont coûté, le bénéfice.
export type HistoryRepair = {
  id: number;
  number: number;
  fullName: string;
  phone: string;
  deviceName: string;
  underWarranty: boolean;
  returnedOn: string;
  paidAmount: number;
  partsCost: number;
  profit: number;
  payMethod: PaymentMethod | null;
};

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

export type HistoryChannel = {
  collected: number;
  salesCount: number;
  profit: number;
  unknownCostSales: number;
  discount: number;
  // Ce que DropZone a payé pour des colis retournés : déjà retranché de `collected` et de `profit`.
  returnFees: number;
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
    returnFees: number;
  };
  // Ce que chaque canal rapporte sur la période, quel que soit l'onglet choisi (17/11, lot 4).
  channels: Record<HistoryChannelType, HistoryChannel>;
  days: HistoryDay[];
  orders: HistoryOrder[];
  ordersTruncated: boolean;
  // Les réparations rendues de la période, seulement sous l'onglet « Réparations ».
  repairs: HistoryRepair[];
  changes: {
    id: number;
    createdAt: string;
    kind: "edited" | "deleted";
    orderNumber: number;
    // Une réparation rendue supprimée : son numéro R-…, sans commande.
    repairNumber: number | null;
    orderId: number | null;
    summary: string;
    userName: string | null;
  }[];
};

export type HistoryParams = { from: string; to: string; type?: HistoryChannelType; q?: string };

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
