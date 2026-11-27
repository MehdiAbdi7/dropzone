// Les règles des photos et de la vidéo d'une variante (26/11), sans accès à la base : le service n'a qu'à les appliquer.

export const MAX_PHOTOS = 8;
export const MAX_VIDEOS = 1;
// 4 Mo : sous les 4,5 Mo que Vercel accepte pour un corps de requête, car la photo traverse sa réécriture vers l'API
// (la vidéo, elle, part directement chez Cloudinary).
export const PHOTO_MAX_BYTES = 4 * 1024 * 1024;

export type MediaKindName = "photo" | "video";

// Le type d'un fichier reçu, d'après son type MIME ; null pour tout ce qu'on n'accepte pas. Seules les photos sont des
// fichiers : la vidéo est un lien de Reel Instagram (27/11), plus rien à envoyer ni à stocker chez Cloudinary.
export function mediaKindOf(mimetype: string): MediaKindName | null {
  return mimetype.startsWith("image/") ? "photo" : null;
}

// Le lien d'un Reel (ou d'une publication) Instagram que le gérant a collé, ramené à sa forme propre
// `https://www.instagram.com/reel/<code>/`, ou null si ce n'est pas un lien Instagram de ce genre (27/11, décision de Mehdi :
// la vidéo n'est plus hébergée chez nous, elle s'affiche depuis Instagram). Tout ce qui suit le code (`?igsh=…`, `?utm_…`)
// est jeté : c'est du suivi, et deux liens du même Reel doivent donner la même adresse. Une story n'est pas acceptée : Instagram
// ne l'affiche pas dans un autre site.
export function reelUrlOf(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !["www.instagram.com", "instagram.com"].includes(url.hostname)) {
    return null;
  }
  // Un lien copié depuis un profil peut être `/<compte>/reel/<code>/` : on cherche le mot « reel », « reels » ou « p » suivi du code.
  const match = url.pathname.match(/\/(reel|reels|p)\/([A-Za-z0-9_-]{5,20})\/?$/);
  if (!match) {
    return null;
  }
  const kind = match[1] === "reels" ? "reel" : match[1];
  return `https://www.instagram.com/${kind}/${match[2]}/`;
}

// Les vidéos déjà enregistrées avant ce changement sont des fichiers Cloudinary (leur lien se termine par `.mp4`) ; un lien de
// Reel, lui, n'a pas de vignette à nous : Instagram affiche la sienne.
export function isReelUrl(url: string): boolean {
  return url.startsWith("https://www.instagram.com/");
}

// La vignette d'une vidéo : Cloudinary fournit une image de couverture en changeant l'extension de l'adresse (anciennes
// vidéos seulement). Un Reel n'en a pas : le lecteur d'Instagram porte la sienne.
export function posterOf(videoUrl: string): string | null {
  return isReelUrl(videoUrl) ? null : videoUrl.replace(/\.[a-z0-9]+$/i, ".jpg");
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
  if (input.kind === "photo" && input.size > PHOTO_MAX_BYTES) {
    return { ok: false, status: 413, message: `Fichier trop lourd (${PHOTO_MAX_BYTES / 1024 / 1024} Mo au maximum)` };
  }
  return { ok: true };
}
