import { api } from "@/lib/api";
import type { OrderDetail, OrderSummary, User } from "@/types/api";

export type RegisterInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
};

export type ProfileInput = Partial<
  Pick<User, "firstName" | "lastName" | "phone" | "addressWilaya" | "addressCommune" | "addressLine">
>;

const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    me: build.query<User, void>({
      query: () => "/auth/me",
      transformResponse: (body: { data: User }) => body.data,
      providesTags: ["Me"],
    }),
    login: build.mutation<User, { email: string; password: string }>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      transformResponse: (body: { data: User }) => body.data,
      invalidatesTags: ["Me", "MyOrders"],
    }),
    register: build.mutation<User, RegisterInput>({
      query: (body) => ({ url: "/auth/register", method: "POST", body }),
      transformResponse: (body: { data: User }) => body.data,
      invalidatesTags: ["Me", "MyOrders"],
    }),
    logout: build.mutation<void, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
    }),
    updateMe: build.mutation<User, ProfileInput>({
      query: (body) => ({ url: "/auth/me", method: "PATCH", body }),
      transformResponse: (body: { data: User }) => body.data,
      invalidatesTags: ["Me"],
    }),
    myOrders: build.query<OrderSummary[], void>({
      query: () => "/orders/mine",
      transformResponse: (body: { data: OrderSummary[] }) => body.data,
      providesTags: ["MyOrders"],
    }),
    myOrder: build.query<OrderDetail, number>({
      query: (number) => `/orders/mine/${number}`,
      transformResponse: (body: { data: OrderDetail }) => body.data,
      providesTags: ["MyOrders"],
    }),
  }),
});

export const {
  useMeQuery,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useUpdateMeMutation,
  useMyOrdersQuery,
  useMyOrderQuery,
} = authApi;
