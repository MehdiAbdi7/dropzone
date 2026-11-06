import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { CartItem } from "@/types/api";

// Le panier ne garde que des SKU et des quantités : les prix sont toujours relus
// auprès du serveur (POST /orders/preview), donc jamais périmés.
type CartState = {
  items: CartItem[];
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
    hydrate(state, action: PayloadAction<CartItem[]>) {
      state.items = action.payload;
      state.hydrated = true;
    },
    // `max` : 1 pour un reconditionné (appareil unique), sinon le stock ou 10.
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

export const { hydrate, addItem, setQuantity, removeItem, clearCart, openCart, closeCart } = cartSlice.actions;
export default cartSlice.reducer;
