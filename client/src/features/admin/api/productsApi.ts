import { api } from "@/lib/api";
import type { Condition, Options, Page, ProductKind, ProductStatus } from "@/types/api";
import { data, imageForm } from "./shared";

// Les produits du back-office : la liste, la fiche, les photos et les articles offerts.

type AdminProductRow = {
  id: number;
  name: string;
  slug: string;
  status: ProductStatus;
  minPrice: number;
  newPrice: number | null;
  image: string | null;
  category: { name: string; slug: string };
  // La marque d'un accessoire (Anker dans Chargeurs), null sans marque.
  maker: { id: number; name: string } | null;
  variantCount: number;
  newStock: number;
  refurbishedAvailable: number;
};

export type AdminVariant = {
  id: number;
  sku: string;
  options: Options;
  price: number;
  // Le prix d'achat (14/11), admin seulement ; null = inconnu.
  purchasePrice: number | null;
  stock: number;
  condition: Condition;
  grade: number | null;
  batteryHealth: number | null;
  replacedParts: string[];
  compatibleParts: string[];
  defects: string[];
  limitations: string[];
  withBox: boolean | null;
  details: string | null;
  // La garantie en mois, l'origine (« Europe ») et la référence du magasin (« 51057 »).
  warrantyMonths: number | null;
  origin: string | null;
  reference: string | null;
  gifts: { giftVariantId: number; quantity: number }[];
  // Les téléphones de la variante d'un accessoire (une taille de verre, refonte du 12/11).
  compatibleModelIds: number[];
};

export type AdminProduct = {
  id: number;
  name: string;
  slug: string;
  description: string;
  status: ProductStatus;
  minPrice: number;
  specs: Options;
  categoryId: number;
  category: { id: number; name: string; kind: ProductKind };
  deviceModelId: number | null;
  deviceModel: { id: number; brand: string; name: string } | null;
  brandId: number | null;
  // La marque d'un accessoire dans son type (Anker dans Chargeurs), null sans marque.
  makerId?: number | null;
  compatibleModels: { id: number; brand: string; name: string }[];
  images: { id: number; url: string; publicId: string | null; position: number }[];
  variants: AdminVariant[];
};

export type ProductBody = {
  name: string;
  description: string;
  categoryId: number;
  deviceModelId: number | null;
  brandId: number | null;
  makerId: number | null;
  compatibleModelIds: number[];
  specs: Options;
  status: ProductStatus;
  variants: (Omit<AdminVariant, "id"> & { id?: number })[];
};

export type GiftOption = { id: number; sku: string; label: string; price: number; stock: number };

const productsApi = api.injectEndpoints({
  endpoints: (build) => ({
    // `brand` : les produits d'une marque ou d'un type d'accessoires (page d'un type, 06/11).
    adminProducts: build.query<
      Page<AdminProductRow>,
      { q?: string; status?: string; category?: string; sort?: "recent" | "name-asc" | "name-desc" | "price-asc" | "price-desc"; brand?: number; limit?: number; page: number }
    >({
      query: (params) => ({ url: "/admin/products", params }),
      providesTags: ["Products"],
    }),
    adminProduct: build.query<AdminProduct, number>({
      query: (id) => `/admin/products/${id}`,
      transformResponse: data<AdminProduct>,
      providesTags: (_result, _error, id) => [{ type: "Products", id }],
    }),
    createProduct: build.mutation<{ id: number; slug: string }, ProductBody>({
      query: (body) => ({ url: "/admin/products", method: "POST", body }),
      transformResponse: data<{ id: number; slug: string }>,
      invalidatesTags: ["Products", "Stats"],
    }),
    updateProduct: build.mutation<{ id: number }, { id: number; body: ProductBody }>({
      query: ({ id, body }) => ({ url: `/admin/products/${id}`, method: "PATCH", body }),
      transformResponse: data<{ id: number }>,
      invalidatesTags: (_result, _error, { id }) => ["Products", { type: "Products", id }, "Stats"],
    }),
    deleteProduct: build.mutation<void, number>({
      query: (id) => ({ url: `/admin/products/${id}`, method: "DELETE" }),
      invalidatesTags: ["Products", "Stats"],
    }),
    uploadImage: build.mutation<unknown, { id: number; file: File }>({
      query: ({ id, file }) => ({ url: `/admin/products/${id}/images`, method: "POST", body: imageForm(file) }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "Products", id }, "Products"],
    }),
    deleteImage: build.mutation<void, { id: number; imageId: number }>({
      query: ({ id, imageId }) => ({ url: `/admin/products/${id}/images/${imageId}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "Products", id }, "Products"],
    }),
    giftOptions: build.query<GiftOption[], void>({
      query: () => "/admin/gift-options",
      transformResponse: data<GiftOption[]>,
      providesTags: ["Products"],
    }),
  }),
});

export const {
  useAdminProductsQuery,
  useAdminProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useUploadImageMutation,
  useDeleteImageMutation,
  useGiftOptionsQuery,
} = productsApi;
