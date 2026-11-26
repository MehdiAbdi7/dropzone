// Les règles des photos et de la vidéo d'une variante (26/11), sans accès à la base : le service n'a qu'à les appliquer.

export const MAX_PHOTOS = 8;
export const MAX_VIDEOS = 1;
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

export type MediaKindName = "photo" | "video";

// Le type d'un fichier reçu, d'après son type MIME ; null pour tout ce qu'on n'accepte pas.
export function mediaKindOf(mimetype: string): MediaKindName | null {
  if (mimetype.startsWith("image/")) return "photo";
  if (mimetype.startsWith("video/")) return "video";
  return null;
}

// La vignette d'une vidéo : Cloudinary fournit une image de couverture en changeant l'extension de l'adresse.
export function posterOf(videoUrl: string): string {
  return videoUrl.replace(/\.[a-z0-9]+$/i, ".jpg");
}

export type MediaRoomResult = { ok: true } | { ok: false; status: number; message: string };

// Peut-on ajouter ce média à la variante ? Une variante épuisée est refusée : la suppression des médias se déclenche
// quand le stock BAISSE, donc des médias posés sur une variante déjà à 0 ne partiraient jamais.
export function checkMediaRoom(input: {
  stock: number;
  kind: MediaKindName;
  photos: number;
  videos: number;
  size: number;
}): MediaRoomResult {
  if (input.stock <= 0) {
    return { ok: false, status: 409, message: "Pas de médias sur une variante épuisée" };
  }
  if (input.kind === "photo" && input.photos >= MAX_PHOTOS) {
    return { ok: false, status: 409, message: `${MAX_PHOTOS} photos au maximum par variante` };
  }
  if (input.kind === "video" && input.videos >= MAX_VIDEOS) {
    return { ok: false, status: 409, message: "Une seule vidéo par variante" };
  }
  const max = input.kind === "photo" ? PHOTO_MAX_BYTES : VIDEO_MAX_BYTES;
  if (input.size > max) {
    return { ok: false, status: 413, message: `Fichier trop lourd (${max / 1024 / 1024} Mo au maximum)` };
  }
  return { ok: true };
}
