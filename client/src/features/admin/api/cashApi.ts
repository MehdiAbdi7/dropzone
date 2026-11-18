import { api } from "@/lib/api";
import type { PaymentMethod } from "@/types/api";
import { data } from "./shared";

// La journée de caisse (14/11) : ouverte avec un fond, fermée avec le montant compté.

export type CashSummary = {
  openingFloat: number;
  // Ce que les mouvements en espèces ont fait entrer (ou sortir) du tiroir.
  cashIn: number;
  // Fond + cashIn : ce qui devrait être dans le tiroir.
  expectedCash: number;
  byMethod: Record<PaymentMethod, number>;
  total: number;
  countedCash: number | null;
  // Compté − fond : ce qui est vraiment rentré.
  entered: number | null;
  // Compté − attendu : négatif, il manque de l'argent.
  gap: number | null;
};

export type CashMovement = {
  id: number;
  createdAt: string;
  amount: number;
  method: PaymentMethod;
  kind: "sale" | "pickup" | "delivery" | "exchange" | "correction" | "return_fee" | "repair";
  orderId: number | null;
  note: string | null;
};

// Une réouverture de la caisse du jour (15/11) : le comptage qu'elle a effacé reste visible.
export type CashReopening = {
  id: number;
  createdAt: string;
  previousCountedCash: number | null;
};

export type CashToday = {
  date: string;
  day: { openingFloat: number; countedCash: number | null; openedAt: string; closedAt: string | null } | null;
  summary: CashSummary | null;
  movements: CashMovement[];
  // L'argent de livraisons arrivé aujourd'hui : jamais dans le tiroir, montré à part (17/11, lot 4).
  deliveriesCollected: number;
  reopenings: CashReopening[];
};

const cashApi = api.injectEndpoints({
  endpoints: (build) => ({
    cashToday: build.query<CashToday, void>({
      query: () => "/admin/cash/today",
      transformResponse: data<CashToday>,
      providesTags: ["Cash"],
    }),
    openCash: build.mutation<CashToday, { openingFloat: number }>({
      query: (body) => ({ url: "/admin/cash/open", method: "POST", body }),
      invalidatesTags: ["Cash", "Stats", "History"],
    }),
    closeCash: build.mutation<CashToday, { countedCash: number }>({
      query: (body) => ({ url: "/admin/cash/close", method: "POST", body }),
      invalidatesTags: ["Cash", "Stats", "History"],
    }),
    reopenCash: build.mutation<CashToday, void>({
      query: () => ({ url: "/admin/cash/reopen", method: "POST" }),
      transformResponse: data<CashToday>,
      invalidatesTags: ["Cash", "Stats", "History"],
    }),
  }),
});

export const { useCashTodayQuery, useOpenCashMutation, useCloseCashMutation, useReopenCashMutation } = cashApi;
