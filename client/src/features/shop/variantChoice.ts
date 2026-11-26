import type { ProductDetail, Variant } from "@/types/api";
import { ofColor } from "./colors";
import type { JourneyCondition } from "./journey";
import { unitLabel } from "./refurbishedUnits";

// Les variantes en stock d'une couleur (27/11) : celles entre lesquelles on choisit sur l'écran de la couleur. Une seule : ses
// photos et sa vidéo s'affichent tout de suite ; deux ou plus : une liste déroulante pour choisir, les médias suivent le choix.
// `condition` connu (page Neuf ou Occasion) : seulement cet état ; `null` (page de référence des couleurs) : les deux.
// Le neuf d'abord, puis les occasions, chacun du moins cher au plus cher.
export function colorVariants(product: ProductDetail, colorName: string, condition: JourneyCondition | null): Variant[] {
  return ofColor(product.variants, colorName)
    .filter((variant) => variant.stock > 0 && (condition === null || variant.condition === condition))
    .sort((a, b) => Number(a.condition !== "new") - Number(b.condition !== "new") || a.price - b.price);
}

// Le texte d'une ligne de la liste. `showCondition` : la liste mélange le neuf et l'occasion, chaque ligne le dit.
export function variantChoiceLabel(variant: Variant, showCondition: boolean): string {
  const label = unitLabel(variant);
  return showCondition ? `${variant.condition === "new" ? "Neuf" : "Occasion"} · ${label}` : label;
}
