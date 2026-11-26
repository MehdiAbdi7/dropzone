import type { Variant, VariantMedia } from "@/types/api";

// Ce que le client lit sur la fiche d'un appareil (« 2 photos et la vidéo »), pour savoir ce qu'il y aura à voir sous le
// téléphone. Null sans média, ou sans le champ (réponse d'une API plus ancienne).
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

// Les photos et la vidéo montrées sous le téléphone (26/11) : celles de la variante choisie. Jamais celles de la couleur :
// plusieurs variantes peuvent partager une couleur, chacune a ses propres médias. Aucune variante choisie, un SKU inconnu ou
// une réponse d'API sans le champ (mise en cache avant cette version) : rien à montrer.
export function shownMedia(variants: Variant[], sku: string | null): VariantMedia[] {
  if (!sku) {
    return [];
  }
  return variants.find((variant) => variant.sku === sku)?.media ?? [];
}
