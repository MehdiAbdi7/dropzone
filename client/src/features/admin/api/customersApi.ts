import { api } from "@/lib/api";
import { data } from "./shared";

// Les clients du back-office : réinitialiser le mot de passe d'un client qui l'a oublié (15/11). Il n'y a pas de
// « mot de passe oublié » par email : l'admin en choisit un nouveau et le donne au client.
const customersApi = api.injectEndpoints({
  endpoints: (build) => ({
    resetCustomerPassword: build.mutation<{ changed: true }, { id: number; newPassword: string }>({
      query: ({ id, newPassword }) => ({ url: `/admin/customers/${id}/password`, method: "POST", body: { newPassword } }),
      transformResponse: data<{ changed: true }>,
    }),
  }),
});

export const { useResetCustomerPasswordMutation } = customersApi;
