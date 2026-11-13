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
  kind: "sale" | "pickup" | "delivery" | "exchange" | "correction";
  orderId: number | null;
  note: string | null;
};

export type CashToday = {
  date: string;
  day: { openingFloat: number; countedCash: number | null; openedAt: string; closedAt: string | null } | null;
  summary: CashSummary | null;
  movements: CashMovement[];
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
      invalidatesTags: ["Cash", "Stats"],
    }),
    closeCash: build.mutation<CashToday, { countedCash: number }>({
      query: (body) => ({ url: "/admin/cash/close", method: "POST", body }),
      invalidatesTags: ["Cash", "Stats"],
    }),
  }),
});

export const { useCashTodayQuery, useOpenCashMutation, useCloseCashMutation } = cashApi;
