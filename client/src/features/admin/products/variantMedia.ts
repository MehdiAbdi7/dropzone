import type { Condition } from "@/types/api";

// Les photos et la vidéo d'une variante dans le back-office (26/11), sans React : ce que l'onglet propose, et le lien
// de la story Instagram. Les plafonds sont ceux de l'API (variantMedia.rules.ts). Depuis le 27/11, la vidéo est le lien de la
// story Instagram : on propose donc deux choses séparées, une photo (un fichier) et la vidéo (un lien).
export const MAX_PHOTOS = 8;
export const MAX_VIDEOS = 1;

type PanelState = {
  canAdd: boolean;
  canAddPhoto: boolean;
  canAddVideo: boolean;
  reason: string | null;
  photos: number;
  videos: number;
};

// Peut-on ajouter un média, et sinon pourquoi ? Une variante pas encore enregistrée n'a pas d'identifiant pour recevoir
// un média ; une variante épuisée est refusée par l'API (ses médias ne partiraient jamais, la suppression se
// déclenche quand le stock baisse). Les photos et la vidéo ont chacune leur plafond : 8 photos n'empêchent pas d'ajouter la
// vidéo. On peut toujours retirer un média existant.
export function mediaPanelState(
  variant: { id?: number; stock: number | string },
  media: { kind: "photo" | "video" }[],
): PanelState {
  const photos = media.filter((item) => item.kind === "photo").length;
  const videos = media.filter((item) => item.kind === "video").length;
  const none = { canAdd: false, canAddPhoto: false, canAddVideo: false, photos, videos };
  if (!variant.id) {
    return { ...none, reason: "Enregistre d'abord la fiche" };
  }
  if (!(Number(variant.stock) > 0)) {
    return { ...none, reason: "Pas de médias sur une variante épuisée" };
  }
  const canAddPhoto = photos < MAX_PHOTOS;
  const canAddVideo = videos < MAX_VIDEOS;
  if (!canAddPhoto && !canAddVideo) {
    return { ...none, reason: `${MAX_PHOTOS} photos et la vidéo sont déjà là : retire-en une pour en ajouter` };
  }
  return { canAdd: true, canAddPhoto, canAddVideo, reason: null, photos, videos };
}

const MO = 1024 * 1024;
export const PHOTO_MAX_MB = 4;

// Ce qui ne va pas avec la photo choisie, avant tout envoi (null si rien) : un refus clair tout de suite. Même plafond que
// l'API : 4 Mo. La vidéo n'est plus un fichier (un lien Instagram).
export function fileProblem(file: { type: string; size: number }): string | null {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return "Formats acceptés : JPEG, PNG ou WebP (la vidéo est le lien de la story Instagram)";
  }
  if (file.size > PHOTO_MAX_MB * MO) {
    return `Photo trop lourde (${PHOTO_MAX_MB} Mo au maximum)`;
  }
  return null;
}

// Le lien à coller dans le bouton « Acheter » de la story : la page de la couleur, l'état et la variante précise.
export function storyLink(input: { slug: string; color: string; condition: Condition; sku: string }): string {
  const etat = input.condition === "new" ? "neuf" : "occasion";
  return `/produits/${input.slug}/couleurs?couleur=${encodeURIComponent(input.color)}&etat=${etat}&variante=${encodeURIComponent(input.sku)}`;
}
