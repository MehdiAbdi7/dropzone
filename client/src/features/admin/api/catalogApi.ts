import { api } from "@/lib/api";
import type { Category, ProductKind, ProductStatus } from "@/types/api";
import { data, imageForm } from "./shared";

// Le Catalogue : catégories, marques, modèles d'appareils et séries.

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

// Une marque d'accessoires (Anker dans Chargeurs) vue du back-office : toutes, même sans produit,
// rangées par type (`typeId` : la ligne de `brands` du type).
export type AdminMaker = {
  id: number;
  typeId: number;
  name: string;
  slug: string;
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
  // L'année de sortie : la Boutique range les modèles du plus récent au plus ancien.
  releaseYear: number | null;
  usage: number;
  // Les couleurs officielles du modèle (pastilles de l'affiche, choix de la Couleur d'une variante).
  colors: string[];
};

type Stock = { newStock: number; dealCount: number };

type AdminCatalogCategory = Stock & {
  id: number;
  name: string;
  slug: string;
  kind: ProductKind;
  brandCount: number;
  seriesCount: number;
  modelCount: number;
  productCount: number;
};

type AdminCatalogBrand = Stock & {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  seriesCount: number;
  productCount: number;
};

export type AdminCatalogCategoryPage = {
  category: { id: number; name: string; slug: string; kind: ProductKind };
  brands: AdminCatalogBrand[];
};

export type AdminSeriesTile = Stock & {
  id: number;
  name: string;
  slug: string;
  coverUrl: string | null;
  modelCount: number;
  modelIds: number[];
  fallbackImage: string | null;
  fallbackColor: string | null;
};

export type AdminCatalogBrandPage = {
  brand: { id: number; name: string; slug: string; category: { id: number; name: string; slug: string; kind: ProductKind } };
  series: AdminSeriesTile[];
  // Les produits en vente dont le modèle n'est rangé dans aucune série : invisibles dans la Boutique.
  unassigned: { deviceModelId: number; name: string; productId: number }[];
};

export type AdminSeriesModel = {
  id: number;
  name: string;
  releaseYear: number | null;
  seriesPosition: number;
  posterColor: string | null;
  colors: string[];
  // `status` : un brouillon a du stock mais n'est pas en vente (grisé sur l'affiche).
  product:
    | (Stock & { id: number; slug: string; status: ProductStatus; image: string | null; soldOutColors: string[] })
    | null;
};

export type AdminSeriesPage = {
  series: {
    id: number;
    name: string;
    slug: string;
    coverUrl: string | null;
    brand: { id: number; name: string; slug: string; makerName: string | null };
    category: { id: number; name: string; slug: string; kind: ProductKind };
  };
  models: AdminSeriesModel[];
  candidates: { id: number; name: string; releaseYear: number | null }[];
};

type AdminSeries = { id: number; brandId: number; name: string; slug: string; coverUrl: string | null };

const catalogApi = api.injectEndpoints({
  endpoints: (build) => ({
    // Catégories (la liste est publique, les écritures sont admin)
    categories: build.query<Category[], void>({
      query: () => "/categories",
      transformResponse: data<Category[]>,
      // « Stage » aussi : la composition d'une catégorie est rangée avec les photos du socle.
      providesTags: ["Categories", "Stage"],
    }),
    createCategory: build.mutation<Category, { name: string; kind: ProductKind }>({
      query: (body) => ({ url: "/admin/categories", method: "POST", body }),
      invalidatesTags: ["Categories"],
    }),
    // `featured: true` : la catégorie mise en avant sur l'accueil (les autres la perdent).
    updateCategory: build.mutation<Category, { id: number; name?: string; kind?: ProductKind; featured?: boolean }>({
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
      // « Products » aussi : le nombre de produits de chaque marque ou type suit les ajouts.
      providesTags: ["Brands", "Products"],
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
      query: ({ id, file }) => ({ url: `/admin/brands/${id}/logo`, method: "POST", body: imageForm(file) }),
      invalidatesTags: ["Brands", "Categories"],
    }),
    deleteBrand: build.mutation<void, number>({
      query: (id) => ({ url: `/admin/brands/${id}`, method: "DELETE" }),
      invalidatesTags: ["Brands", "Categories"],
    }),

    // Marques d'accessoires : l'étape marque de la Boutique (Accessoires › Chargeurs › Anker)
    makers: build.query<AdminMaker[], void>({
      query: () => "/admin/accessory-makers",
      transformResponse: data<AdminMaker[]>,
      // « Products » aussi : le nombre de produits de chaque marque suit les ajouts.
      providesTags: ["Makers", "Products"],
    }),
    createMaker: build.mutation<AdminMaker, { typeId: number; name: string }>({
      query: ({ typeId, ...body }) => ({ url: `/admin/brands/${typeId}/makers`, method: "POST", body }),
      transformResponse: data<AdminMaker>,
      invalidatesTags: ["Makers", "Categories"],
    }),
    updateMaker: build.mutation<AdminMaker, { id: number; name?: string; position?: number; logoUrl?: string | null }>({
      query: ({ id, ...body }) => ({ url: `/admin/accessory-makers/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Makers", "Categories"],
    }),
    uploadMakerLogo: build.mutation<unknown, { id: number; file: File }>({
      query: ({ id, file }) => ({ url: `/admin/accessory-makers/${id}/logo`, method: "POST", body: imageForm(file) }),
      invalidatesTags: ["Makers", "Categories"],
    }),
    deleteMaker: build.mutation<void, number>({
      query: (id) => ({ url: `/admin/accessory-makers/${id}`, method: "DELETE" }),
      invalidatesTags: ["Makers", "Categories"],
    }),

    // Modèles d'appareils
    models: build.query<DeviceModel[], void>({
      query: () => "/admin/models",
      transformResponse: data<DeviceModel[]>,
      providesTags: ["Models"],
    }),
    createModel: build.mutation<DeviceModel, { brand: string; name: string; kind: ProductKind; releaseYear: number }>({
      query: (body) => ({ url: "/admin/models", method: "POST", body }),
      transformResponse: data<DeviceModel>,
      invalidatesTags: ["Models"],
    }),
    // Corriger l'année d'un modèle (sa place dans la Boutique), ou la couleur de sa lueur.
    // `colors` : les couleurs officielles du modèle (pastilles de l'affiche) ; `posterColor` :
    // la lueur, une de ces couleurs (null = la première).
    updateModel: build.mutation<
      DeviceModel,
      { id: number; releaseYear?: number; colors?: string[]; posterColor?: string | null }
    >({
      query: ({ id, ...body }) => ({ url: `/admin/models/${id}`, method: "PATCH", body }),
      transformResponse: data<DeviceModel>,
      invalidatesTags: ["Models", "Series"],
    }),
    deleteModel: build.mutation<void, number>({
      query: (id) => ({ url: `/admin/models/${id}`, method: "DELETE" }),
      invalidatesTags: ["Models"],
    }),

    // Les trois écrans du Catalogue (et la page d'une catégorie)
    catalog: build.query<AdminCatalogCategory[], void>({
      query: () => "/admin/catalog",
      transformResponse: data<AdminCatalogCategory[]>,
      providesTags: ["Series", "Categories", "Brands", "Products"],
    }),
    catalogCategory: build.query<AdminCatalogCategoryPage, number>({
      query: (id) => `/admin/catalog/categories/${id}`,
      transformResponse: data<AdminCatalogCategoryPage>,
      providesTags: ["Series", "Categories", "Brands", "Products"],
    }),
    catalogBrand: build.query<AdminCatalogBrandPage, number>({
      query: (id) => `/admin/catalog/brands/${id}`,
      transformResponse: data<AdminCatalogBrandPage>,
      providesTags: ["Series", "Brands", "Products", "Models"],
    }),
    catalogSeries: build.query<AdminSeriesPage, number>({
      query: (id) => `/admin/catalog/series/${id}`,
      transformResponse: data<AdminSeriesPage>,
      providesTags: ["Series", "Products", "Models"],
    }),

    // La gestion des séries
    createSeries: build.mutation<AdminSeries, { brandId: number; name: string }>({
      query: ({ brandId, name }) => ({ url: `/admin/brands/${brandId}/series`, method: "POST", body: { name } }),
      transformResponse: data<AdminSeries>,
      invalidatesTags: ["Series"],
    }),
    renameSeries: build.mutation<AdminSeries, { id: number; name: string }>({
      query: ({ id, name }) => ({ url: `/admin/series/${id}`, method: "PATCH", body: { name } }),
      transformResponse: data<AdminSeries>,
      invalidatesTags: ["Series"],
    }),
    uploadSeriesCover: build.mutation<unknown, { id: number; file: File }>({
      query: ({ id, file }) => ({ url: `/admin/series/${id}/cover`, method: "POST", body: imageForm(file) }),
      invalidatesTags: ["Series"],
    }),
    deleteSeries: build.mutation<void, number>({
      query: (id) => ({ url: `/admin/series/${id}`, method: "DELETE" }),
      invalidatesTags: ["Series", "Models"],
    }),
    // Toute la liste des modèles de la série, dans l'ordre de l'affiche.
    setSeriesModels: build.mutation<void, { id: number; modelIds: number[] }>({
      query: ({ id, modelIds }) => ({ url: `/admin/series/${id}/models`, method: "PUT", body: { modelIds } }),
      invalidatesTags: ["Series", "Models"],
    }),
  }),
});

export const {
  useCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useBrandsQuery,
  useCreateBrandMutation,
  useUpdateBrandMutation,
  useUploadBrandLogoMutation,
  useDeleteBrandMutation,
  useMakersQuery,
  useCreateMakerMutation,
  useUpdateMakerMutation,
  useUploadMakerLogoMutation,
  useDeleteMakerMutation,
  useModelsQuery,
  useCreateModelMutation,
  useUpdateModelMutation,
  useDeleteModelMutation,
  useCatalogQuery,
  useCatalogCategoryQuery,
  useCatalogBrandQuery,
  useCatalogSeriesQuery,
  useCreateSeriesMutation,
  useRenameSeriesMutation,
  useUploadSeriesCoverMutation,
  useDeleteSeriesMutation,
  useSetSeriesModelsMutation,
} = catalogApi;
