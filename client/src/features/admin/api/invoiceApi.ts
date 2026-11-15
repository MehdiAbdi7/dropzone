import { api } from "@/lib/api";
import type { Condition, Options, OrderStatus, OrderType, PaymentMethod } from "@/types/api";
import { data } from "./shared";

// La facture (lot 6) : les réglages qui s'impriment, et la facture d'une commande.

// Réglages › Facture. Un champ vide n'apparaît pas sur la facture ; la TVA est éteinte par défaut.
export type InvoiceSettings = {
  shopName: string;
  legalForm: string;
  address: string;
  phones: string;
  email: string;
  instagram: string;
  registerNumber: string;
  nif: string;
  nis: string;
  taxArticle: string;
  rib: string;
  warrantyTerms: string;
  footerNote: string;
  vatEnabled: boolean;
  vatRate: number;
};

// La facture d'une commande, remplie par le serveur. Jamais de prix d'achat ni de bénéfice.
export type Invoice = {
  number: string;
  year: number;
  issuedAt: string;
  shop: Omit<InvoiceSettings, "warrantyTerms" | "footerNote" | "vatEnabled" | "vatRate" | "shopName"> & { name: string };
  order: { id: number; number: number; dailyNumber: number; businessDate: string; type: OrderType; status: OrderStatus; createdAt: string };
  customer: { fullName: string; phone: string; wilaya: string | null; commune: string | null; address: string | null };
  // null tant que rien n'est payé (une livraison se paie à la réception).
  payment: { methods: PaymentMethod[]; paid: number } | null;
  lines: {
    name: string;
    options: Options;
    condition: Condition;
    conditionReport: string | null;
    warrantyMonths: number | null;
    quantity: number;
    listPrice: number;
    unitPrice: number;
    lineTotal: number;
    isGift: boolean;
  }[];
  subtotal: number;
  shippingFee: number;
  total: number;
  totalInWords: string;
  discount: number;
  vat: { rate: number; excludingTax: number; amount: number } | null;
  tradeIn: { modelName: string; color: string; price: number } | null;
  difference: number | null;
  limitationsAccepted: boolean;
  note: string | null;
  warrantyTerms: string;
  footerNote: string;
};

const invoiceApi = api.injectEndpoints({
  endpoints: (build) => ({
    invoiceSettings: build.query<InvoiceSettings, void>({
      query: () => "/admin/invoice-settings",
      transformResponse: data<InvoiceSettings>,
      providesTags: ["InvoiceSettings"],
    }),
    saveInvoiceSettings: build.mutation<InvoiceSettings, InvoiceSettings>({
      query: (body) => ({ url: "/admin/invoice-settings", method: "PUT", body }),
      transformResponse: data<InvoiceSettings>,
      invalidatesTags: ["InvoiceSettings"],
    }),
    // Une lecture en POST : la PREMIÈRE ouverture attribue le numéro de facture. Jamais gardée en cache,
    // pour qu'une facture réimprimée montre les réglages et la commande d'aujourd'hui.
    invoice: build.query<Invoice, number>({
      query: (id) => ({ url: `/admin/orders/${id}/invoice`, method: "POST" }),
      transformResponse: data<Invoice>,
      keepUnusedDataFor: 0,
    }),
  }),
});

export const { useInvoiceSettingsQuery, useSaveInvoiceSettingsMutation, useInvoiceQuery } = invoiceApi;
