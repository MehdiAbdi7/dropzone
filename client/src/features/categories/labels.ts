import { DEVICE_KINDS } from "@/config/catalog";
import type { ProductKind } from "@/types/api";

// « 127 modèles » pour une catégorie d'appareils, « 12 produits » pour les accessoires.
export function countLabel(kind: ProductKind, count: number): string {
  const unit = DEVICE_KINDS.includes(kind) ? "modèle" : "produit";
  return `${count} ${unit}${count > 1 ? "s" : ""}`;
}
