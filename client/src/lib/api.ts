import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// L'API RTK Query de base. Le navigateur appelle /api/… : le front relaie vers
// l'API (rewrites de next.config.ts), donc même origine et cookie envoyé tout seul.
// Chaque fonctionnalité ajoute ses routes avec `api.injectEndpoints` (features/*/…Api.ts).
export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: "/api", credentials: "include" }),
  // Les étiquettes : une écriture « invalide » une étiquette, et les lectures qui
  // la portent se rechargent toutes seules.
  tagTypes: ["Me", "MyOrders", "Products", "Categories", "Brands", "Models", "Choices", "Orders", "Stats", "Customers", "Series", "Stage"],
  endpoints: () => ({}),
});
