import { api } from "@/lib/api";
import { data } from "../api/shared";

// Le code à 4 chiffres des prix d'achat (27/11) : savoir s'il existe et le taper (tous les rôles du back-office), le régler
// et le retirer (l'admin seul). L'API ne renvoie jamais le code : seulement « un code existe-t-il ».
export type CostPinStatus = { configured: boolean };

const costPinApi = api.injectEndpoints({
  endpoints: (build) => ({
    costPinStatus: build.query<CostPinStatus, void>({
      query: () => "/admin/cost-pin",
      transformResponse: data<CostPinStatus>,
      providesTags: ["CostPin"],
    }),
    // Une erreur 401 (« Code incorrect ») ou 429 (trop d'essais) est une réponse normale : le dialogue la montre.
    verifyCostPin: build.mutation<{ ok: true }, string>({
      query: (pin) => ({ url: "/admin/cost-pin/verify", method: "POST", body: { pin } }),
      transformResponse: data<{ ok: true }>,
    }),
    setCostPin: build.mutation<CostPinStatus, string>({
      query: (pin) => ({ url: "/admin/cost-pin", method: "PUT", body: { pin } }),
      transformResponse: data<CostPinStatus>,
      invalidatesTags: ["CostPin"],
    }),
    clearCostPin: build.mutation<CostPinStatus, void>({
      query: () => ({ url: "/admin/cost-pin", method: "DELETE" }),
      transformResponse: data<CostPinStatus>,
      invalidatesTags: ["CostPin"],
    }),
  }),
});

export const { useCostPinStatusQuery, useVerifyCostPinMutation, useSetCostPinMutation, useClearCostPinMutation } = costPinApi;
