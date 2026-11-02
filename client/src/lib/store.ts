import { configureStore } from "@reduxjs/toolkit";
import cartReducer from "@/features/cart/cartSlice";
import { api } from "./api";

// Une fonction, pas un store global : avec le rendu serveur, chaque visiteur doit
// avoir son propre store (StoreProvider en crée un par onglet).
export function makeStore() {
  return configureStore({
    reducer: {
      cart: cartReducer,
      [api.reducerPath]: api.reducer,
    },
    middleware: (getDefault) => getDefault().concat(api.middleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
