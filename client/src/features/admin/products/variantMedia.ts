import type { Condition } from "@/types/api";

// Les photos et la vidéo d'une variante dans le back-office (26/11), sans React : ce que l'onglet propose, et le lien
// de la story Instagram. Les plafonds sont ceux de l'API (variantMedia.rules.ts).
export const MAX_PHOTOS = 8;
export const MAX_VIDEOS = 1;

type PanelState = { canAdd: boolean; reason: string | null; photos: number; videos: number };

// Peut-on ajouter un média, et sinon pourquoi ? Une variante pas encore enregistrée n'a pas d'identifiant pour recevoir
// un fichier ; une variante épuisée est refusée par l'API (ses médias ne partiraient jamais, la suppression se
// déclenche quand le stock baisse). On peut toujours retirer un média existant.
export function mediaPanelState(
  variant: { id?: number; stock: number | string },
  media: { kind: "photo" | "video" }[],
): PanelState {
  const photos = media.filter((item) => item.kind === "photo").length;
  const videos = media.filter((item) => item.kind === "video").length;
  if (!variant.id) {
    return { canAdd: false, reason: "Enregistre d'abord la fiche", photos, videos };
  }
  if (!(Number(variant.stock) > 0)) {
    return { canAdd: false, reason: "Pas de médias sur une variante épuisée", photos, videos };
  }
  if (photos >= MAX_PHOTOS && videos >= MAX_VIDEOS) {
    return { canAdd: false, reason: `${MAX_PHOTOS} photos et la vidéo sont déjà là : retire-en une pour en ajouter`, photos, videos };
  }
  return { canAdd: true, reason: null, photos, videos };
}

const MO = 1024 * 1024;
export const PHOTO_MAX_MB = 4;
export const VIDEO_MAX_MB = 50;

// Ce qui ne va pas avec le fichier choisi, avant tout envoi (null si rien) : un refus clair tout de suite vaut mieux
// qu'une minute d'envoi pour apprendre que c'est trop lourd. Mêmes plafonds que l'API : photo 4 Mo, vidéo 50 Mo.
export function fileProblem(file: { type: string; size: number }): string | null {
  const photo = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
  const video = ["video/mp4", "video/quicktime", "video/webm"].includes(file.type);
  if (!photo && !video) {
    return "Formats acceptés : JPEG, PNG, WebP, MP4, MOV ou WebM";
  }
  if (photo && file.size > PHOTO_MAX_MB * MO) {
    return `Photo trop lourde (${PHOTO_MAX_MB} Mo au maximum)`;
  }
  if (video && file.size > VIDEO_MAX_MB * MO) {
    return `Vidéo trop lourde (${VIDEO_MAX_MB} Mo au maximum)`;
  }
  return null;
}

// Le lien à coller dans le bouton « Acheter » de la story : la page de la couleur, l'état et la variante précise.
export function storyLink(input: { slug: string; color: string; condition: Condition; sku: string }): string {
  const etat = input.condition === "new" ? "neuf" : "occasion";
  return `/produits/${input.slug}/couleurs?couleur=${encodeURIComponent(input.color)}&etat=${etat}&variante=${encodeURIComponent(input.sku)}`;
}
