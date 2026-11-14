import { api } from "@/lib/api";
import type { Condition, Options, OrderStatus, OrderType, Page, PaymentMethod } from "@/types/api";
import { data } from "./shared";

// Le tableau de bord, les commandes et les clients du back-office.

// Ce que toute commande du back-office sait depuis le 14/11 : son type, son numéro du jour et,
// pour un retrait, son créneau. Les dates arrivent en ISO (colonnes DATE).
type OrderReception = {
  type: OrderType;
  dailyNumber: number;
  businessDate: string;
  pickupDate: string | null;
  pickupTime: string | null;
  // null pour un retrait ou une vente au magasin.
  wilaya: string | null;
};

type AdminOrderRow = OrderReception & {
  id: number;
  number: number;
  fullName: string;
  phone: string;
  total: number;
  status: OrderStatus;
  createdAt: string;
  _count: { items: number };
};

export type AdminOrder = OrderReception & {
  id: number;
  number: number;
  status: OrderStatus;
  createdAt: string;
  fullName: string;
  phone: string;
  commune: string | null;
  address: string | null;
  note: string | null;
  subtotal: number;
  shippingFee: number;
  total: number;
  limitationsAccepted: boolean;
  allowedTransitions: OrderStatus[];
  user: { id: number; email: string; firstName: string; lastName: string } | null;
  // L'argent de la commande et ses traces (lot 2) : ce qui est payé (net des corrections), chaque
  // mouvement du journal, le bénéfice (null = prix d'achat inconnu) et les modifications faites.
  paid: number;
  payments: { id: number; createdAt: string; amount: number; method: PaymentMethod; kind: string; note: string | null }[];
  profit: number | null;
  events: { id: number; createdAt: string; kind: "edited" | "deleted"; summary: string; amountDelta: number }[];
  items: {
    id: number;
    sku: string;
    name: string;
    options: Options;
    condition: Condition;
    conditionReport: string | null;
    // La garantie au jour de la commande (null pour un accessoire ou une commande d'avant).
    warrantyMonths?: number | null;
    unitPrice: number;
    // Le prix catalogue d'origine et qui a accordé le prix actuel (lot 3) ; null pour une commande
    // d'avant le lot 3 ou une ligne sans remise.
    listPrice: number | null;
    grantedByName: string | null;
    quantity: number;
    isGift: boolean;
  }[];
  // La réduction totale de la commande (lot 3), 0 sans prix catalogue connu.
  discount: number;
};

// Un prix négocié : une ligne de la commande par son `id`, son nouveau prix accordé.
export type NegotiatedPrice = { id: number; unitPrice: number };

// Le corps de PATCH /admin/orders/:id : une ligne existante par son `id`, un nouvel article par son
// `sku` ; une ligne payante qui n'est pas listée est retirée.
export type EditOrderLine = { id: number; quantity: number; unitPrice: number } | { sku: string; quantity: number; unitPrice: number };
export type EditOrderBody = {
  lines: EditOrderLine[];
  method?: PaymentMethod;
  fullName?: string;
  phone?: string;
  note?: string | null;
};

export type Stats = {
  revenueToday: number;
  revenueMonth: number;
  ordersToday: number;
  ordersByStatus: Partial<Record<OrderStatus, number>>;
  // Les retraits attendus aujourd'hui, par heure (14/11).
  pickupsToday: { id: number; dailyNumber: number; fullName: string; phone: string; pickupTime: string; total: number }[];
  // La journée de caisse ; cashedToday : tout ce qui est encaissé aujourd'hui, tous moyens.
  cash: { open: boolean; closed: boolean; expectedCash: number | null; cashedToday: number };
  refurbishedAvailable: number;
  refurbishedSold: number;
};

type Customer = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressWilaya: string | null;
  createdAt: string;
  _count: { orders: number };
};

const ordersApi = api.injectEndpoints({
  endpoints: (build) => ({
    stats: build.query<Stats, void>({
      query: () => "/admin/stats",
      transformResponse: data<Stats>,
      providesTags: ["Stats"],
    }),
    adminOrders: build.query<Page<AdminOrderRow>, { status?: OrderStatus; type?: OrderType; q?: string; page: number }>({
      query: (params) => ({ url: "/admin/orders", params }),
      providesTags: ["Orders"],
    }),
    adminOrder: build.query<AdminOrder, number>({
      query: (id) => `/admin/orders/${id}`,
      transformResponse: data<AdminOrder>,
      providesTags: (_result, _error, id) => [{ type: "Orders", id }],
    }),
    // `prices` : les prix négociés (lot 3), acceptés avec la confirmation d'une livraison.
    changeStatus: build.mutation<unknown, { id: number; status: OrderStatus; prices?: NegotiatedPrice[] }>({
      query: ({ id, status, prices }) => ({
        url: `/admin/orders/${id}/status`,
        method: "PATCH",
        body: { status, ...(prices && prices.length > 0 ? { prices } : {}) },
      }),
      invalidatesTags: (_result, _error, { id }) => ["Orders", { type: "Orders", id }, "Stats", "Products", "History"],
    }),
    // Valider un retrait au comptoir (14/11) : le paiement entre dans la caisse du jour.
    validatePickup: build.mutation<unknown, { id: number; method: PaymentMethod; prices?: NegotiatedPrice[] }>({
      query: ({ id, method, prices }) => ({
        url: `/admin/orders/${id}/pickup`,
        method: "POST",
        body: { method, ...(prices && prices.length > 0 ? { prices } : {}) },
      }),
      invalidatesTags: (_result, _error, { id }) => ["Orders", { type: "Orders", id }, "Stats", "Cash", "History"],
    }),
    // Modifier une commande après coup (lot 2) : stock, argent et trace suivent côté serveur.
    editOrder: build.mutation<unknown, { id: number } & EditOrderBody>({
      query: ({ id, ...body }) => ({ url: `/admin/orders/${id}`, method: "PATCH", body }),
      invalidatesTags: (_result, _error, { id }) => ["Orders", { type: "Orders", id }, "Stats", "Cash", "Products", "History"],
    }),
    deleteOrder: build.mutation<{ id: number; refunded: number }, number>({
      query: (id) => ({ url: `/admin/orders/${id}`, method: "DELETE" }),
      transformResponse: data<{ id: number; refunded: number }>,
      invalidatesTags: ["Orders", "Stats", "Cash", "Products", "History"],
    }),
    customers: build.query<Page<Customer>, { q?: string; page: number }>({
      query: (params) => ({ url: "/admin/customers", params }),
      providesTags: ["Customers"],
    }),
  }),
});

export const {
  useStatsQuery,
  useAdminOrdersQuery,
  useAdminOrderQuery,
  useChangeStatusMutation,
  useValidatePickupMutation,
  useEditOrderMutation,
  useDeleteOrderMutation,
  useCustomersQuery,
} = ordersApi;
