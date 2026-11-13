import type { Variant } from "@/types/api";
import { MAX_PER_LINE } from "./cartSlice";

// La quantité et la barre du panier (05/11), sans React.

// Ce qu'on peut encore ajouter d'une variante : le stock disponible, plafonné à 10 par ligne.
export function quantityLimit(variant: Pick<Variant, "stock" | "condition">, inCart: number): number {
  const max = Math.min(variant.stock, MAX_PER_LINE);
  return Math.max(0, max - inCart);
}

// Une quantité ramenée dans la limite : au moins 1, sauf quand plus rien n'est possible.
export function clampQuantity(quantity: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(Math.max(quantity, 1), limit);
}

// La barre est partout dans la boutique, sauf sur la commande (le récapitulatif y est déjà).
// Depuis le 06/11, le panier n'a plus de page : c'est une fenêtre (CartWindow).
export function showCartBar(pathname: string): boolean {
  return !pathname.startsWith("/commande");
}
