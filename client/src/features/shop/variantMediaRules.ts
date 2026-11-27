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
  // La vidéo d'un appareil est sa story Instagram (un lien) ; une ancienne vidéo est un fichier. Le client voit « la story ».
  const video = media.find((item) => item.kind === "video");
  if (video) parts.push(isInstagramLink(video.url) ? "la story" : "la vidéo");
  return parts.join(" et ");
}

// La vidéo d'une variante est le lien d'une story Instagram (27/11), ou, pour une ancienne vidéo, un fichier Cloudinary. Un
// lien Instagram ne s'affiche pas dans la page : la tuile « Story » l'ouvre sur Instagram (un nouvel onglet).
const INSTAGRAM_PREFIX = "https://www.instagram.com/";

export function isInstagramLink(url: string): boolean {
  return url.startsWith(INSTAGRAM_PREFIX);
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
