"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import { hydrate } from "@/features/cart/cartSlice";
import { makeStore, type AppStore } from "@/lib/store";
import type { CartItem } from "@/types/api";

const CART_KEY = "dropzone-cart";

function readCart(): CartItem[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }
    // Un panier abîmé (modifié à la main) ne doit pas faire planter la page.
    return parsed.filter(
      (item): item is CartItem =>
        typeof item?.sku === "string" && Number.isInteger(item?.quantity) && item.quantity > 0,
    );
  } catch {
    return [];
  }
}

export default function StoreProvider({ children }: { children: ReactNode }) {
  // useState avec une fonction : le store est créé une seule fois par onglet,
  // au premier rendu, puis React rend toujours le même.
  const [store] = useState<AppStore>(makeStore);

  // Le panier survit au rafraîchissement : relu au montage, réécrit à chaque changement.
  useEffect(() => {
    store.dispatch(hydrate(readCart()));
    let previous = store.getState().cart.items;
    return store.subscribe(() => {
      const items = store.getState().cart.items;
      if (items !== previous) {
        previous = items;
        try {
          localStorage.setItem(CART_KEY, JSON.stringify(items));
        } catch {
          // Navigation privée ou stockage plein : le panier vit seulement dans l'onglet.
        }
      }
    });
  }, [store]);

  return <Provider store={store}>{children}</Provider>;
}
