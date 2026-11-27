// Les règles des photos et de la vidéo d'une variante (26/11), sans accès à la base : le service n'a qu'à les appliquer.

export const MAX_PHOTOS = 8;
export const MAX_VIDEOS = 1;
// 4 Mo : sous les 4,5 Mo que Vercel accepte pour un corps de requête, car la photo traverse sa réécriture vers l'API
// (la vidéo, elle, part directement chez Cloudinary).
export const PHOTO_MAX_BYTES = 4 * 1024 * 1024;

export type MediaKindName = "photo" | "video";

// Le type d'un fichier reçu, d'après son type MIME ; null pour tout ce qu'on n'accepte pas. Seules les photos sont des
// fichiers : la vidéo est un lien Instagram (27/11), plus rien à envoyer ni à stocker chez Cloudinary.
export function mediaKindOf(mimetype: string): MediaKindName | null {
  return mimetype.startsWith("image/") ? "photo" : null;
}

// Le lien Instagram que le gérant a collé, ramené à sa forme propre, ou null si ce n'est pas un lien de ce genre (27/11,
// décision de Mehdi : la vidéo n'est plus hébergée chez nous, un clic sur la tuile « Story » ouvre la story sur Instagram).
// Sont acceptés une story (`/stories/<compte>/<numéro>/`, ou une story « À la une » : `/stories/highlights/<numéro>/`), un
// Reel et une publication. Tout ce qui suit l'adresse (`?igsh=…`, `?utm_…`) est jeté : c'est du suivi, et deux liens de la
// même vidéo doivent donner la même adresse.
export function instagramUrlOf(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !["www.instagram.com", "instagram.com"].includes(url.hostname)) {
    return null;
  }
  // Une story : l'adresse garde le compte (ou « highlights ») et le numéro de la story.
  const story = url.pathname.match(/^\/stories\/([A-Za-z0-9._]+)\/(\d{5,25})\/?$/);
  if (story) {
    return `https://www.instagram.com/stories/${story[1]}/${story[2]}/`;
  }
  // Un lien copié depuis un profil peut être `/<compte>/reel/<code>/` : on cherche le mot « reel », « reels » ou « p » suivi du code.
  const match = url.pathname.match(/\/(reel|reels|p)\/([A-Za-z0-9_-]{5,20})\/?$/);
  if (!match) {
    return null;
  }
  const kind = match[1] === "reels" ? "reel" : match[1];
  return `https://www.instagram.com/${kind}/${match[2]}/`;
}

// Les vidéos déjà enregistrées avant ce changement sont des fichiers Cloudinary (leur lien se termine par `.mp4`) ; un lien
// Instagram, lui, n'a pas de vignette à nous : le site montre une tuile « Story » qui ouvre Instagram.
export function isInstagramUrl(url: string): boolean {
  return url.startsWith("https://www.instagram.com/");
}

// La vignette d'une vidéo : Cloudinary fournit une image de couverture en changeant l'extension de l'adresse (anciennes
// vidéos seulement). Un lien Instagram n'en a pas.
export function posterOf(videoUrl: string): string | null {
  return isInstagramUrl(videoUrl) ? null : videoUrl.replace(/\.[a-z0-9]+$/i, ".jpg");
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
