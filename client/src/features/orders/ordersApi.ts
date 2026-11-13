import { api } from "@/lib/api";
import type { StoreHours } from "@/lib/algiersTime";
import type { CartItem, CartPreview, OrderDetail, OrderType } from "@/types/api";

// Livraison ou retrait au magasin (14/11).
export type Fulfillment = "delivery" | "pickup";

type CheckoutBase = {
  items: CartItem[];
  fullName: string;
  phone: string;
  note?: string;
  acceptTerms: boolean;
  acceptLimitations: boolean;
  cartHash: string;
};

type CheckoutInput =
  | (CheckoutBase & { fulfillment: "delivery"; wilaya: string; commune: string; address: string })
  | (CheckoutBase & { fulfillment: "pickup"; pickupDay: "today" | "tomorrow"; pickupTime: string });

export type PlacedOrder = {
  number: number;
  dailyNumber: number;
  total: number;
  phone: string;
  type: OrderType;
  // « 2026-11-15 » pour un retrait, null pour une livraison.
  pickupDate: string | null;
  pickupTime: string | null;
};

const ordersApi = api.injectEndpoints({
  endpoints: (build) => ({
    // Une lecture en POST : le panier part dans le corps. RTK Query met le résultat
    // en cache par panier (et par mode de réception), et le recalcule dès qu'il change.
    cartPreview: build.query<CartPreview, { items: CartItem[]; fulfillment: Fulfillment }>({
      query: (body) => ({ url: "/orders/preview", method: "POST", body }),
      transformResponse: (body: { data: CartPreview }) => body.data,
      keepUnusedDataFor: 0,
    }),
    createOrder: build.mutation<PlacedOrder, CheckoutInput>({
      query: (body) => ({ url: "/orders", method: "POST", body }),
      transformResponse: (body: { data: PlacedOrder }) => body.data,
      invalidatesTags: ["MyOrders"],
    }),
    trackOrder: build.mutation<OrderDetail, { number: number; phone: string }>({
      query: (body) => ({ url: "/orders/track", method: "POST", body }),
      transformResponse: (body: { data: OrderDetail }) => body.data,
    }),
    // Les horaires du magasin : ils décident des créneaux de retrait proposés.
    storeHours: build.query<StoreHours, void>({
      query: () => "/store/hours",
      transformResponse: (body: { data: StoreHours }) => body.data,
    }),
  }),
});

export const { useCartPreviewQuery, useCreateOrderMutation, useTrackOrderMutation, useStoreHoursQuery } = ordersApi;
