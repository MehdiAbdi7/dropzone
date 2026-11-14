import { api } from "@/lib/api";
import { data } from "./shared";

// La page Livraisons (17/11, lot 4) : ce que les livraisons vont rapporter, ce qui reste à encaisser,
// ce qui est arrivé jour par jour. Suivi à part de la caisse du magasin.
export type DeliverySummary = {
  inProgress: { count: number; total: number };
  toCollect: { count: number; total: number };
  // `fees` : ce que DropZone a payé en frais de retour (positif), déjà retranché de l'argent arrivé.
  returned: { count: number; fees: number };
  collectedByDay: { date: string; total: number }[];
  collectedTotal: number;
};

const deliveriesApi = api.injectEndpoints({
  endpoints: (build) => ({
    deliverySummary: build.query<DeliverySummary, void>({
      query: () => "/admin/deliveries/summary",
      transformResponse: data<DeliverySummary>,
      // Chaque changement d'état d'une commande (confirmer, expédier, encaisser, retourner) la relit.
      providesTags: ["Orders"],
    }),
  }),
});

export const { useDeliverySummaryQuery } = deliveriesApi;
