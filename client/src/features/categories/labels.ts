import { DEVICE_KINDS } from "@/config/catalog";
import { formatPrice } from "@/lib/format";
import type { ProductKind } from "@/types/api";

// « 127 modèles » pour une catégorie d'appareils, « 12 produits » pour les accessoires.
export function countLabel(kind: ProductKind, count: number): string {
  const unit = DEVICE_KINDS.includes(kind) ? "modèle" : "produit";
  return `${count} ${unit}${count > 1 ? "s" : ""}`;
}

// « dès 38 000 DA », ou rien quand l'API n'a pas de prix (aucun produit publié).
export function startingPrice(minPrice: number | null): string | null {
  return minPrice !== null && minPrice > 0 ? `dès ${formatPrice(minPrice)}` : null;
}
