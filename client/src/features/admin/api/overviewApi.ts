import { api } from "@/lib/api";
import type { Options, OrderType } from "@/types/api";
import type { OverviewPoint } from "../dashboard/chartMath";
import { data } from "./shared";

// L'aperçu du tableau de bord (20/11) : de quoi dessiner les graphiques, sur 7 ou 30 jours.

export type OverviewChannel = { type: OrderType; total: number; count: number };

// Un produit vendu : de quoi l'afficher et ouvrir sa commande.
export type RecentSale = {
  orderId: number;
  dailyNumber: number;
  type: OrderType;
  soldOn: string;
  name: string;
  options: Options;
  quantity: number;
  unitPrice: number;
  image: string | null;
};

export type Overview = {
  // Un point par jour, du plus ancien à aujourd'hui, les jours sans vente à zéro.
  series: OverviewPoint[];
  // Toujours les quatre canaux, dans le même ordre.
  channels: OverviewChannel[];
  // Les ventes de la période sans bénéfice connu (un prix d'achat manque).
  profitUnknown: number;
  // Les 8 derniers produits vendus, quelle que soit la période.
  recent: RecentSale[];
};

export type OverviewDays = 7 | 30;

const overviewApi = api.injectEndpoints({
  endpoints: (build) => ({
    overview: build.query<Overview, OverviewDays>({
      query: (days) => ({ url: "/admin/stats/overview", params: { days } }),
      transformResponse: data<Overview>,
      // Une vente change les chiffres : les mêmes étiquettes que le reste du tableau de bord.
      providesTags: ["Stats"],
    }),
  }),
});

export const { useOverviewQuery } = overviewApi;
