import type { CartPreview, Variant } from "@/types/api";
import { MAX_PER_LINE } from "./cartSlice";

// La quantité et la barre du panier (05/11), sans React.

// Ce qu'on peut encore ajouter d'une variante : tout le stock d'un neuf (10 au plus par
// ligne, contre les commandes abusives), une seule affaire, moins ce qui est déjà au panier.
export function quantityLimit(variant: Pick<Variant, "stock" | "condition">, inCart: number): number {
  const max = variant.condition === "refurbished" ? Math.min(variant.stock, 1) : Math.min(variant.stock, MAX_PER_LINE);
  return Math.max(0, max - inCart);
}

// Une quantité ramenée dans la limite : au moins 1, sauf quand plus rien n'est possible.
export function clampQuantity(quantity: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(Math.max(quantity, 1), limit);
}

const THUMBS = 3;

// Les chiffres de la barre : les articles achetés (les cadeaux ne comptent pas, comme dans
// l'en-tête), le total, et jusqu'à 3 vignettes.
export function cartBarSummary(preview: CartPreview): { count: number; total: number; thumbs: string[]; hidden: number } {
  const bought = preview.lines.filter((line) => !line.isGift);
  const withImage = bought.flatMap((line) => (line.image ? [line.image] : []));
  return {
    count: bought.reduce((sum, line) => sum + line.quantity, 0),
    total: preview.total,
    thumbs: withImage.slice(0, THUMBS),
    hidden: Math.max(0, bought.length - THUMBS),
  };
}

// La barre est partout dans la boutique, sauf sur la commande (le récapitulatif y est déjà).
// Depuis le 06/11, le panier n'a plus de page : c'est une fenêtre (CartWindow).
export function showCartBar(pathname: string): boolean {
  return !pathname.startsWith("/commande");
}

// La quantité d'une ligne du panneau : celle du panier du navigateur, à jour au clic (l'aperçu
// du serveur arrive un aller-retour plus tard), sinon celle de l'aperçu.
export function lineQuantity(items: { sku: string; quantity: number }[], sku: string, fallback: number): number {
  return items.find((item) => item.sku === sku)?.quantity ?? fallback;
}
