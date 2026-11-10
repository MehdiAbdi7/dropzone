import { api } from "@/lib/api";
import type { CartItem, CartPreview, OrderDetail } from "@/types/api";

type CheckoutInput = {
  items: CartItem[];
  fullName: string;
  phone: string;
  wilaya: string;
  commune: string;
  address: string;
  note?: string;
  acceptTerms: boolean;
  acceptLimitations: boolean;
  cartHash: string;
};

const ordersApi = api.injectEndpoints({
  endpoints: (build) => ({
    // Une lecture en POST : le panier part dans le corps. RTK Query met le résultat
    // en cache par panier, et le recalcule dès que le panier change.
    cartPreview: build.query<CartPreview, CartItem[]>({
      query: (items) => ({ url: "/orders/preview", method: "POST", body: { items } }),
      transformResponse: (body: { data: CartPreview }) => body.data,
      keepUnusedDataFor: 0,
    }),
    createOrder: build.mutation<{ number: number; total: number; phone: string }, CheckoutInput>({
      query: (body) => ({ url: "/orders", method: "POST", body }),
      transformResponse: (body: { data: { number: number; total: number; phone: string } }) => body.data,
      invalidatesTags: ["MyOrders"],
    }),
    trackOrder: build.mutation<OrderDetail, { number: number; phone: string }>({
      query: (body) => ({ url: "/orders/track", method: "POST", body }),
      transformResponse: (body: { data: OrderDetail }) => body.data,
    }),
  }),
});

export const { useCartPreviewQuery, useCreateOrderMutation, useTrackOrderMutation } = ordersApi;
