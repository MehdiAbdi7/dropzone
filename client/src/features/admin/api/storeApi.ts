import { api } from "@/lib/api";
import type { StoreHours } from "@/lib/algiersTime";
import { data } from "./shared";

// Les horaires du magasin (14/11), réglés par l'admin. La lecture est publique
// (useStoreHoursQuery de features/orders/ordersApi) : le formulaire de commande en a besoin.
const storeApi = api.injectEndpoints({
  endpoints: (build) => ({
    saveStoreHours: build.mutation<StoreHours, StoreHours>({
      query: (body) => ({ url: "/admin/store/hours", method: "PUT", body }),
      transformResponse: data<StoreHours>,
      invalidatesTags: ["StoreHours"],
    }),
  }),
});

export const { useSaveStoreHoursMutation } = storeApi;
