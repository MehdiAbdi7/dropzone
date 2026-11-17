import { api } from "@/lib/api";
import type { AccountPayload, StaffRole } from "@/features/admin/accounts/accountRules";
import { data } from "./shared";

// Les comptes du personnel (lot 7) : l'admin les crée, change leur rôle, les désactive, leur donne un nouveau
// mot de passe. L'API ne renvoie jamais le mot de passe ni son hash.
export type Account = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: StaffRole;
  disabled: boolean;
  createdAt: string;
};

const accountsApi = api.injectEndpoints({
  endpoints: (build) => ({
    accounts: build.query<Account[], void>({
      query: () => "/admin/accounts",
      transformResponse: data<Account[]>,
      providesTags: ["Accounts"],
    }),
    createAccount: build.mutation<Account, AccountPayload>({
      query: (body) => ({ url: "/admin/accounts", method: "POST", body }),
      transformResponse: data<Account>,
      invalidatesTags: ["Accounts"],
    }),
    // Un changement de rôle (jamais vers « admin », l'API le refuse) ou la désactivation d'un compte.
    updateAccount: build.mutation<Account, { id: number; role?: Exclude<StaffRole, "admin">; disabled?: boolean }>({
      query: ({ id, ...body }) => ({ url: `/admin/accounts/${id}`, method: "PATCH", body }),
      transformResponse: data<Account>,
      invalidatesTags: ["Accounts"],
    }),
    resetAccountPassword: build.mutation<{ changed: true }, { id: number; newPassword: string }>({
      query: ({ id, newPassword }) => ({ url: `/admin/accounts/${id}/password`, method: "POST", body: { newPassword } }),
      transformResponse: data<{ changed: true }>,
    }),
  }),
});

export const { useAccountsQuery, useCreateAccountMutation, useUpdateAccountMutation, useResetAccountPasswordMutation } = accountsApi;
