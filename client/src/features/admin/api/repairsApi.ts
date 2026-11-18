import { api } from "@/lib/api";
import type { RepairStatus } from "../repairs/repairsView";
import { data } from "./shared";

// Les fiches de réparation de l'atelier (18/11, étape 2) : la liste, la création, les pièces d'une fiche, les étapes.
// Réservé à l'admin (aucune route dans la table des droits) jusqu'à l'étape 5.

export type { RepairStatus };

export type RepairRow = {
  id: number;
  number: number;
  status: RepairStatus;
  fullName: string;
  phone: string;
  deviceName: string;
  underWarranty: boolean;
  createdAt: string;
  partsCount: number;
  total: number;
};

export type RepairLine = {
  id: number;
  partId: number;
  name: string;
  quantity: number;
  // Copiés de la pièce quand elle a été ajoutée : changer la pièce ensuite ne les change pas.
  unitCost: number;
  unitPrice: number;
  // La pièce est déjà sortie du stock.
  consumed: boolean;
};

export type RepairDetail = RepairRow & {
  deviceColor: string | null;
  deviceState: string | null;
  issue: string;
  accessories: string | null;
  laborPrice: number | null;
  note: string | null;
  warrantyEndsAt: string | null;
  warrantyForcedOff: boolean;
  originOrderNumber: number | null;
  parts: RepairLine[];
  events: { status: RepairStatus; createdAt: string; userId: number | null }[];
  nextStatuses: RepairStatus[];
};

export type RepairCounts = Record<"open" | RepairStatus, number>;

export type WarrantyHit = {
  itemId: number;
  orderNumber: number;
  soldOn: string;
  name: string;
  warrantyMonths: number;
  warrantyEndsAt: string;
  underWarranty: boolean;
};

export type RepairBody = {
  fullName: string;
  phone: string;
  deviceName: string;
  deviceColor?: string;
  deviceState?: string;
  issue: string;
  accessories?: string;
  laborPrice?: number;
  originItemId?: number;
  forceOutOfWarranty?: boolean;
};

export type RepairPatchBody = Partial<Omit<RepairBody, "laborPrice" | "originItemId" | "forceOutOfWarranty">> & {
  // null : on efface la main-d'œuvre.
  laborPrice?: number | null;
  note?: string;
};

export type RepairStage = "open" | RepairStatus;

const repairsApi = api.injectEndpoints({
  endpoints: (build) => ({
    repairs: build.query<RepairRow[], { stage: RepairStage; q: string }>({
      query: (params) => ({ url: "/admin/repairs", params }),
      transformResponse: data<RepairRow[]>,
      providesTags: ["Repairs"],
    }),
    repairCounts: build.query<RepairCounts, void>({
      query: () => "/admin/repairs/counts",
      transformResponse: data<RepairCounts>,
      providesTags: ["Repairs"],
    }),
    repair: build.query<RepairDetail, number>({
      query: (id) => `/admin/repairs/${id}`,
      transformResponse: data<RepairDetail>,
      providesTags: ["Repairs"],
    }),
    // L'article vendu par DropZone, retrouvé par le téléphone du client ou le numéro de la commande.
    warrantySearch: build.query<WarrantyHit[], { phone?: string; order?: string }>({
      query: (params) => ({ url: "/admin/repairs/warranty", params }),
      transformResponse: data<WarrantyHit[]>,
    }),
    createRepair: build.mutation<RepairDetail, RepairBody>({
      query: (body) => ({ url: "/admin/repairs", method: "POST", body }),
      transformResponse: data<RepairDetail>,
      invalidatesTags: ["Repairs"],
    }),
    updateRepair: build.mutation<RepairDetail, { id: number; body: RepairPatchBody }>({
      query: ({ id, body }) => ({ url: `/admin/repairs/${id}`, method: "PATCH", body }),
      transformResponse: data<RepairDetail>,
      // Une autre main-d'œuvre peut ramener la fiche à « Devis à valider » : liste et détail se relisent.
      invalidatesTags: ["Repairs"],
    }),
    // Les pièces et les étapes bougent le stock : la page Pièces se relit aussi.
    addRepairPart: build.mutation<RepairDetail, { id: number; partId: number; quantity: number }>({
      query: ({ id, ...body }) => ({ url: `/admin/repairs/${id}/parts`, method: "POST", body }),
      transformResponse: data<RepairDetail>,
      invalidatesTags: ["Repairs", "Parts"],
    }),
    updateRepairPart: build.mutation<RepairDetail, { id: number; lineId: number; quantity: number }>({
      query: ({ id, lineId, quantity }) => ({ url: `/admin/repairs/${id}/parts/${lineId}`, method: "PATCH", body: { quantity } }),
      transformResponse: data<RepairDetail>,
      invalidatesTags: ["Repairs", "Parts"],
    }),
    removeRepairPart: build.mutation<RepairDetail, { id: number; lineId: number }>({
      query: ({ id, lineId }) => ({ url: `/admin/repairs/${id}/parts/${lineId}`, method: "DELETE" }),
      transformResponse: data<RepairDetail>,
      invalidatesTags: ["Repairs", "Parts"],
    }),
    changeRepairStatus: build.mutation<RepairDetail, { id: number; status: RepairStatus }>({
      query: ({ id, status }) => ({ url: `/admin/repairs/${id}/status`, method: "POST", body: { status } }),
      transformResponse: data<RepairDetail>,
      invalidatesTags: ["Repairs", "Parts"],
    }),
    deleteRepair: build.mutation<{ ok: true }, number>({
      query: (id) => ({ url: `/admin/repairs/${id}`, method: "DELETE" }),
      transformResponse: data<{ ok: true }>,
      invalidatesTags: ["Repairs", "Parts"],
    }),
  }),
});

export const {
  useRepairsQuery,
  useRepairCountsQuery,
  useRepairQuery,
  useWarrantySearchQuery,
  useCreateRepairMutation,
  useUpdateRepairMutation,
  useAddRepairPartMutation,
  useUpdateRepairPartMutation,
  useRemoveRepairPartMutation,
  useChangeRepairStatusMutation,
  useDeleteRepairMutation,
} = repairsApi;
