import { createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { CartLine } from "@/types/api";
import { snapshotOf, toRequest, type StoredCartItem } from "./cartSnapshot";

// Le panier garde des SKU, des quantités et la description de chaque ligne (13/11, voir
// cartSnapshot.ts). Jamais de prix : ils sont toujours relus auprès du serveur
// (POST /orders/preview), donc jamais périmés.
type CartState = {
  items: StoredCartItem[];
  // false tant que le panier n'a pas été relu depuis localStorage (au premier rendu,
  // le serveur ne connaît pas le panier : on n'affiche pas un faux « 0 »).
  hydrated: boolean;
  // La fenêtre du panier (06/11, comme le ticket de Niwa) : ouverte par l'en-tête, la barre
  // ou « Voir le panier ». Pas gardée dans localStorage (StoreProvider n'y écrit que `items`).
  open: boolean;
};

const initialState: CartState = { items: [], hydrated: false, open: false };

export const MAX_PER_LINE = 10;

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    hydrate(state, action: PayloadAction<StoredCartItem[]>) {
      state.items = action.payload;
      state.hydrated = true;
    },
    // La réponse du serveur est arrivée : chaque article recopie sa description (sans le prix),
    // pour l'afficher tout de suite à la prochaine visite. Les cadeaux ne sont pas des
    // articles du panier : ignorés. Rien n'est écrit si la description n'a pas changé.
    linesConfirmed(state, action: PayloadAction<CartLine[]>) {
      for (const line of action.payload) {
        if (line.isGift) continue;
        const item = state.items.find((candidate) => candidate.sku === line.sku);
        if (!item) continue;
        const snapshot = snapshotOf(line);
        if (JSON.stringify(item.snapshot) !== JSON.stringify(snapshot)) {
          item.snapshot = snapshot;
        }
      }
    },
    // `max` : le stock de la variante, plafonné à 10 par ligne.
    addItem(state, action: PayloadAction<{ sku: string; quantity: number; max: number }>) {
      const { sku, quantity, max } = action.payload;
      const line = state.items.find((item) => item.sku === sku);
      if (line) {
        line.quantity = Math.min(line.quantity + quantity, max);
      } else {
        state.items.push({ sku, quantity: Math.min(quantity, max) });
      }
    },
    // `max` : le maximum de la ligne donné par l'aperçu du panier (le stock réel, 10 au plus).
    setQuantity(state, action: PayloadAction<{ sku: string; quantity: number; max: number }>) {
      const line = state.items.find((item) => item.sku === action.payload.sku);
      if (line) {
        line.quantity = Math.max(1, Math.min(action.payload.quantity, action.payload.max, MAX_PER_LINE));
      }
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.sku !== action.payload);
    },
    clearCart(state) {
      state.items = [];
    },
    openCart(state) {
      state.open = true;
    },
    closeCart(state) {
      state.open = false;
    },
  },
});

export const { hydrate, linesConfirmed, addItem, setQuantity, removeItem, clearCart, openCart, closeCart } =
  cartSlice.actions;
export default cartSlice.reducer;

// Ce qu'on envoie au serveur (aperçu et commande) : SKU et quantité. Mémoïsé : le même tableau
// tant que les SKU et quantités ne changent pas, même quand une description est recopiée.
// Sans ça, RTK Query verrait un nouvel argument et relancerait l'aperçu.
export const selectCartRequest = createSelector(
  [(state: { cart: CartState }) => state.cart.items],
  (items) => toRequest(items),
  { memoizeOptions: { resultEqualityCheck: (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b) } },
);
