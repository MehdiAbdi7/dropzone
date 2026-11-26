import { formatOptions, formatPrice } from "@/lib/format";
import type { Variant } from "@/types/api";

// Le libellé d'un appareil d'occasion dans la liste déroulante du choix (27/11) : ce qui le distingue des autres (stockage,
// état, batterie) et son prix, sur une ligne. La couleur est déjà choisie à l'étape d'avant : elle n'y figure pas.
export function unitLabel(variant: Variant): string {
  const options = Object.fromEntries(Object.entries(variant.options).filter(([key]) => key !== "Couleur"));
  return [
    formatOptions(options),
    variant.grade !== null ? `état ${variant.grade}/10` : "",
    variant.batteryHealth !== null ? `batterie ${variant.batteryHealth} %` : "",
    formatPrice(variant.price),
  ]
    .filter(Boolean)
    .join(" · ");
}
