import type { ChoiceGroup } from "@/config/catalog";
import { api } from "@/lib/api";
import type {
  Category,
  Condition,
  Options,
  OrderStatus,
  Page,
  ProductKind,
  ProductStatus,
} from "@/types/api";

// ---------- Les formes propres au back-office ----------

export type AdminProductRow = {
  id: number;
  name: string;
  slug: string;
  status: ProductStatus;
  minPrice: number;
  image: string | null;
  category: { name: string };
  variantCount: number;
  newStock: number;
  refurbishedAvailable: number;
};

export type AdminVariant = {
  id: number;
  sku: string;
  options: Options;
  price: number;
  stock: number;
  condition: Condition;
  grade: number | null;
  batteryHealth: number | null;
  replacedParts: string[];
  defects: string[];
  limitations: string[];
  gifts: { giftVariantId: number; quantity: number }[];
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
  compatibleModelIds: number[];
  specs: Options;
  status: ProductStatus;
  variants: (Omit<AdminVariant, "id"> & { id?: number })[];
};

// Une marque vue du back-office : toutes, même sans produit, avec sa catégorie.
export type AdminBrand = {
  id: number;
  categoryId: number;
  name: string;
  slug: string;
  makerName: string | null;
  logoUrl: string | null;
  position: number;
  productCount: number;
};

export type DeviceModel = {
  id: number;
  brand: string;
  name: string;
  slug: string;
  kind: ProductKind;
  usage: number;
};

export type Choices = Record<ChoiceGroup, { id: number; label: string }[]>;

export type GiftOption = { id: number; sku: string; label: string; price: number; stock: number };

export type AdminOrderRow = {
  id: number;
  number: number;
  fullName: string;
  phone: string;
  wilaya: string;
  total: number;
  status: OrderStatus;
  createdAt: string;
  _count: { items: number };
};

export type AdminOrder = {
  id: number;
  number: number;
  status: OrderStatus;
  createdAt: string;
  fullName: string;
  phone: string;
  wilaya: string;
  commune: string;
  address: string;
  note: string | null;
  subtotal: number;
  shippingFee: number;
  total: number;
  limitationsAccepted: boolean;
  allowedTransitions: OrderStatus[];
  user: { id: number; email: string; firstName: string; lastName: string } | null;
  items: {
    id: number;
    sku: string;
    name: string;
    options: Options;
    condition: Condition;
    conditionReport: string | null;
    unitPrice: number;
    quantity: number;
    isGift: boolean;
  }[];
};

export type Stats = {
  revenueToday: number;
  revenueMonth: number;
  ordersToday: number;
  ordersByStatus: Partial<Record<OrderStatus, number>>;
  lowStock: { id: number; name: string; sku: string; stock: number }[];
  refurbishedAvailable: number;
  refurbishedSold: number;
};

export type Customer = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressWilaya: string | null;
  createdAt: string;
  _count: { orders: number };
};

const data = <T,>(body: { data: T }) => body.data;

const adminApi = api.injectEndpoints({
  endpoints: (build) => ({
    stats: build.query<Stats, void>({
      query: () => "/admin/stats",
      transformResponse: data<Stats>,
      providesTags: ["Stats"],
    }),

    // Produits
    adminProducts: build.query<Page<AdminProductRow>, { q?: string; status?: string; page: number }>({
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
      query: ({ id, file }) => {
        const form = new FormData();
        form.append("image", file);
        return { url: `/admin/products/${id}/images`, method: "POST", body: form };
      },
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

    // Catégories (la liste est publique, les écritures sont admin)
    categories: build.query<Category[], void>({
      query: () => "/categories",
      transformResponse: data<Category[]>,
      providesTags: ["Categories"],
    }),
    createCategory: build.mutation<Category, { name: string; kind: ProductKind }>({
      query: (body) => ({ url: "/admin/categories", method: "POST", body }),
      invalidatesTags: ["Categories"],
    }),
    updateCategory: build.mutation<Category, { id: number; name?: string; kind?: ProductKind }>({
      query: ({ id, ...body }) => ({ url: `/admin/categories/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Categories"],
    }),
    deleteCategory: build.mutation<void, number>({
      query: (id) => ({ url: `/admin/categories/${id}`, method: "DELETE" }),
      invalidatesTags: ["Categories", "Brands"],
    }),

    // Marques (la liste publique des catégories les porte aussi : on l'invalide avec)
    brands: build.query<AdminBrand[], void>({
      query: () => "/admin/brands",
      transformResponse: data<AdminBrand[]>,
      providesTags: ["Brands"],
    }),
    createBrand: build.mutation<AdminBrand, { categoryId: number; name: string; makerName?: string | null }>({
      query: ({ categoryId, ...body }) => ({ url: `/admin/categories/${categoryId}/brands`, method: "POST", body }),
      transformResponse: data<AdminBrand>,
      invalidatesTags: ["Brands", "Categories"],
    }),
    updateBrand: build.mutation<
      AdminBrand,
      { id: number; name?: string; makerName?: string | null; position?: number; logoUrl?: string | null }
    >({
      query: ({ id, ...body }) => ({ url: `/admin/brands/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Brands", "Categories"],
    }),
    uploadBrandLogo: build.mutation<unknown, { id: number; file: File }>({
      query: ({ id, file }) => {
        const form = new FormData();
        form.append("image", file);
        return { url: `/admin/brands/${id}/logo`, method: "POST", body: form };
      },
      invalidatesTags: ["Brands", "Categories"],
    }),
    deleteBrand: build.mutation<void, number>({
      query: (id) => ({ url: `/admin/brands/${id}`, method: "DELETE" }),
      invalidatesTags: ["Brands", "Categories"],
    }),

    // Modèles d'appareils et listes à cocher
    models: build.query<DeviceModel[], void>({
      query: () => "/admin/models",
      transformResponse: data<DeviceModel[]>,
      providesTags: ["Models"],
    }),
    createModel: build.mutation<DeviceModel, { brand: string; name: string; kind: ProductKind }>({
      query: (body) => ({ url: "/admin/models", method: "POST", body }),
      transformResponse: data<DeviceModel>,
      invalidatesTags: ["Models"],
    }),
    deleteModel: build.mutation<void, number>({
      query: (id) => ({ url: `/admin/models/${id}`, method: "DELETE" }),
      invalidatesTags: ["Models"],
    }),
    choices: build.query<Choices, void>({
      query: () => "/admin/choices",
      transformResponse: data<Choices>,
      providesTags: ["Choices"],
    }),
    createChoice: build.mutation<{ id: number; label: string }, { group: ChoiceGroup; label: string }>({
      query: (body) => ({ url: "/admin/choices", method: "POST", body }),
      transformResponse: data<{ id: number; label: string }>,
      invalidatesTags: ["Choices"],
    }),
    deleteChoice: build.mutation<void, number>({
      query: (id) => ({ url: `/admin/choices/${id}`, method: "DELETE" }),
      invalidatesTags: ["Choices"],
    }),

    // Commandes et clients
    adminOrders: build.query<Page<AdminOrderRow>, { status?: OrderStatus; q?: string; page: number }>({
      query: (params) => ({ url: "/admin/orders", params }),
      providesTags: ["Orders"],
    }),
    adminOrder: build.query<AdminOrder, number>({
      query: (id) => `/admin/orders/${id}`,
      transformResponse: data<AdminOrder>,
      providesTags: (_result, _error, id) => [{ type: "Orders", id }],
    }),
    changeStatus: build.mutation<unknown, { id: number; status: OrderStatus }>({
      query: ({ id, status }) => ({ url: `/admin/orders/${id}/status`, method: "PATCH", body: { status } }),
      invalidatesTags: (_result, _error, { id }) => ["Orders", { type: "Orders", id }, "Stats", "Products"],
    }),
    customers: build.query<Page<Customer>, { q?: string; page: number }>({
      query: (params) => ({ url: "/admin/customers", params }),
      providesTags: ["Customers"],
    }),
  }),
});

export const {
  useStatsQuery,
  useAdminProductsQuery,
  useAdminProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useUploadImageMutation,
  useDeleteImageMutation,
  useGiftOptionsQuery,
  useCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useBrandsQuery,
  useCreateBrandMutation,
  useUpdateBrandMutation,
  useUploadBrandLogoMutation,
  useDeleteBrandMutation,
  useModelsQuery,
  useCreateModelMutation,
  useDeleteModelMutation,
  useChoicesQuery,
  useCreateChoiceMutation,
  useDeleteChoiceMutation,
  useAdminOrdersQuery,
  useAdminOrderQuery,
  useChangeStatusMutation,
  useCustomersQuery,
} = adminApi;
