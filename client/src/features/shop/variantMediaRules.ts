import type { Variant, VariantMedia } from "@/types/api";

// Les photos et la vidéo montrées sous le téléphone (26/11) : celles de la variante choisie. Jamais celles de la
// couleur : plusieurs variantes peuvent partager une couleur, chacune a ses propres médias. Aucune variante choisie, un
// SKU inconnu ou une réponse d'API sans le champ (mise en cache avant cette version) : rien à montrer.
// Ce que le client lit sur la carte d'un appareil avant même de cliquer (« 2 photos et la vidéo »), pour qu'il devine qu'il
// y a quelque chose à voir. Null sans média, ou sans le champ (réponse d'une API plus ancienne).
export function mediaSummary(media: VariantMedia[] | undefined): string | null {
  if (!media || media.length === 0) {
    return null;
  }
  const photos = media.filter((item) => item.kind === "photo").length;
  const parts = [];
  if (photos > 0) parts.push(`${photos} photo${photos > 1 ? "s" : ""}`);
  if (media.some((item) => item.kind === "video")) parts.push("la vidéo");
  return parts.join(" et ");
}

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
