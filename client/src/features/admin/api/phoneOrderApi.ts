import { api } from "@/lib/api";
import type { OrderStatus, OrderType } from "@/types/api";
import type { PhoneOrderBody } from "../sales/phoneOrder";
import { data } from "./shared";

// La commande prise par téléphone (19/11) : le vendeur la saisit, elle démarre « À confirmer » (livraison) ou
// « Réservée » (réservation). `notices` : les mises en garde du calcul du ticket, par exemple un cadeau épuisé
// qui n'a pas été offert, à dire au client.
export type PhoneOrderDone = {
  id: number;
  number: number;
  dailyNumber: number;
  total: number;
  type: OrderType;
  status: OrderStatus;
  pickupDate: string | null;
  pickupTime: string | null;
  reservationMode: "two_days" | "unlimited" | null;
  advanceAmount: number | null;
  notices: string[];
};

const phoneOrderApi = api.injectEndpoints({
  endpoints: (build) => ({
    // Une commande prend du stock, ajoute un numéro du jour et change l'accueil : tout se relit. Pas d'argent.
    createPhoneOrder: build.mutation<PhoneOrderDone, PhoneOrderBody>({
      query: (body) => ({ url: "/admin/orders", method: "POST", body }),
      transformResponse: data<PhoneOrderDone>,
      invalidatesTags: ["Orders", "Stats", "Products"],
    }),
  }),
});

export const { useCreatePhoneOrderMutation } = phoneOrderApi;
