import { api } from "@/lib/api";
import type { Condition, Options, OrderStatus, Page } from "@/types/api";
import { data } from "./shared";

// Le tableau de bord, les commandes et les clients du back-office.

type AdminOrderRow = {
  id: number;
  number: number;
  fullName: string;
  phone: string;
  wilaya: string;
  total: number;
  status: OrderStatus;
  createdAt: string;
  _count: { items: number };
};

type AdminOrder = {
  id: number;
  number: number;
  status: OrderStatus;
  createdAt: string;
  fullName: string;
  phone: string;
  wilaya: string;
  commune: string;
  address: string;
  note: string | null;
  subtotal: number;
  shippingFee: number;
  total: number;
  limitationsAccepted: boolean;
  allowedTransitions: OrderStatus[];
  user: { id: number; email: string; firstName: string; lastName: string } | null;
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
    quantity: number;
    isGift: boolean;
  }[];
};

export type Stats = {
  revenueToday: number;
  revenueMonth: number;
  ordersToday: number;
  ordersByStatus: Partial<Record<OrderStatus, number>>;
  lowStock: { id: number; name: string; sku: string; stock: number }[];
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
    adminOrders: build.query<Page<AdminOrderRow>, { status?: OrderStatus; q?: string; page: number }>({
      query: (params) => ({ url: "/admin/orders", params }),
      providesTags: ["Orders"],
    }),
    adminOrder: build.query<AdminOrder, number>({
      query: (id) => `/admin/orders/${id}`,
      transformResponse: data<AdminOrder>,
      providesTags: (_result, _error, id) => [{ type: "Orders", id }],
    }),
    changeStatus: build.mutation<unknown, { id: number; status: OrderStatus }>({
      query: ({ id, status }) => ({ url: `/admin/orders/${id}/status`, method: "PATCH", body: { status } }),
      invalidatesTags: (_result, _error, { id }) => ["Orders", { type: "Orders", id }, "Stats", "Products"],
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
  useCustomersQuery,
} = ordersApi;
