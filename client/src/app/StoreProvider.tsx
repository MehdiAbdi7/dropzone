"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import { hydrate } from "@/features/cart/cartSlice";
import { parseStoredCart, type StoredCartItem } from "@/features/cart/cartSnapshot";
import { makeStore, type AppStore } from "@/lib/store";

const CART_KEY = "dropzone-cart";

// Un panier abîmé (modifié à la main) ne doit pas faire planter la page : parseStoredCart
// vérifie chaque article. L'ancien format (SKU et quantité seuls) se relit tel quel.
function readCart(): StoredCartItem[] {
  try {
    return parseStoredCart(localStorage.getItem(CART_KEY));
  } catch {
    // localStorage refusé (navigation privée stricte) : panier vide.
    return [];
  }
}

export default function StoreProvider({ children }: { children: ReactNode }) {
  // useState avec une fonction : le store est créé une seule fois par onglet,
  // au premier rendu, puis React rend toujours le même.
  const [store] = useState<AppStore>(makeStore);

  // Le panier survit au rafraîchissement : relu au montage, réécrit à chaque changement
  // (quantités, et descriptions recopiées depuis le serveur ; jamais de prix).
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
