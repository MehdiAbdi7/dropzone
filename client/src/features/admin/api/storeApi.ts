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

// La réservation illimitée (18/11) : l'avance et le numéro BaridiMob, lus et réglés par l'admin seul.
export type ReservationSettings = { advance: number; baridiNumber: string };

const reservationApi = api.injectEndpoints({
  endpoints: (build) => ({
    reservationSettings: build.query<ReservationSettings, void>({
      query: () => "/admin/store/reservation",
      transformResponse: data<ReservationSettings>,
      providesTags: ["StoreHours"],
    }),
    saveReservationSettings: build.mutation<ReservationSettings, ReservationSettings>({
      query: (body) => ({ url: "/admin/store/reservation", method: "PUT", body }),
      transformResponse: data<ReservationSettings>,
      invalidatesTags: ["StoreHours"],
    }),
  }),
});

export const { useSaveStoreHoursMutation } = storeApi;
export const { useReservationSettingsQuery, useSaveReservationSettingsMutation } = reservationApi;
