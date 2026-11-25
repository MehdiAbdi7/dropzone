// Des téléphones de la même taille (25/11, demande de Mehdi : « il faut que les photos aient exactement
// la même taille, surtout les modèles »). Les photos ne le sont pas : le téléphone n'occupe pas la même
// part de chaque image (de 69 % à 99 % de la hauteur, mesuré), et leurs résolutions vont du simple au
// double. Plutôt que de refaire les photos une à une, Cloudinary les recadre à l'affichage : `e_trim`
// coupe la transparence autour du téléphone, `c_pad` le pose, à la plus grande taille possible, dans un
// cadre fixe. Tous les téléphones y ont alors exactement la même hauteur. Aucune photo n'est renvoyée.

export type PhotoShape = "portrait" | "wide";

// Deux cadres, parce que les compositions diffèrent : les photos de couleur sont des paires verticales
// (rapport largeur sur hauteur mesuré jusqu'à 0,83), celles de modèles des paires horizontales (jusqu'à
// 1,46). Un cadre doit être plus large que la composition la plus large, sinon cette photo sera un peu
// plus petite que les autres : scripts/auditPhotoFrames.mjs le vérifie sur toute la boutique.
export const PHOTO_FRAMES: Record<PhotoShape, { width: number; height: number }> = {
  portrait: { width: 900, height: 1000 },
  wide: { width: 1600, height: 1000 },
};

const CLOUDINARY = "https://res.cloudinary.com/";

// L'adresse recadrée d'une photo. Tout ce qui n'est pas une photo Cloudinary (l'icône SVG de secours
// d'une catégorie, une autre adresse) reste tel quel, comme une photo déjà recadrée.
export function uniformPhoto(url: string, shape: PhotoShape): string {
  if (!url.startsWith(CLOUDINARY) || !url.includes("/image/upload/") || url.includes("c_pad")) {
    return url;
  }
  const { width, height } = PHOTO_FRAMES[shape];
  return url.replace("/image/upload/", `/image/upload/e_trim/c_pad,w_${width},h_${height},b_transparent/`);
}
