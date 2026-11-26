import type { Variant, VariantMedia } from "@/types/api";

// Les photos et la vidéo montrées sous le téléphone (26/11) : celles de la variante choisie. Jamais celles de la
// couleur : plusieurs variantes peuvent partager une couleur, chacune a ses propres médias. Aucune variante choisie, un
// SKU inconnu ou une réponse d'API sans le champ (mise en cache avant cette version) : rien à montrer.
// Met l'élément dont le SKU est donné en tête, sans toucher à l'ordre des autres ni à la liste d'origine.
export function pinFirst<T extends { sku: string }>(list: T[], sku: string | null): T[] {
  const pinned = sku ? list.find((item) => item.sku === sku) : undefined;
  return pinned ? [pinned, ...list.filter((item) => item !== pinned)] : list;
}

export function shownMedia(variants: Variant[], sku: string | null): VariantMedia[] {
  if (!sku) {
    return [];
  }
  return variants.find((variant) => variant.sku === sku)?.media ?? [];
}
