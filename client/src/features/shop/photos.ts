// Des téléphones de la même taille (25/11, demande de Mehdi : « il faut que les photos aient exactement
// la même taille, surtout les modèles »). Les photos ne le sont pas : le téléphone n'occupe pas la même
// part de chaque image (de 69 % à 99 % de la hauteur, mesuré), et leurs résolutions vont du simple au
// double. Plutôt que de refaire les photos une à une, Cloudinary les recadre à l'affichage : `e_trim`
// coupe la transparence autour du téléphone, `c_pad` le pose, à la plus grande taille possible, dans un
// cadre fixe. Tous les téléphones y ont alors exactement la même hauteur. Aucune photo n'est renvoyée.

// `color` : les photos de couleur ; `model` : les photos de modèle (une photo de série, une carte).
export type PhotoShape = "color" | "model";

// Deux cadres, parce que les compositions diffèrent. Mesuré sur toute la boutique (362 photos de couleur,
// 113 de modèle) avec scripts/auditPhotoFrames.mjs, par le rapport largeur sur hauteur de la zone du
// téléphone : les photos de couleur vont de 0,49 à 1,41 (médiane 0,80), celles de modèles de 0,81 à 3,06
// (médiane 1,46 : une photo peut montrer trois téléphones côte à côte). Un cadre doit être aussi large que
// la composition : au-delà, cette photo est un peu plus petite que les autres (la hauteur égale n'est
// possible que dans le cadre). Cadre de couleur à 1,2 : 361 photos sur 362. Cadre de modèle à 2,0 : 102
// sur 113 ; seules les photos plus larges (la plus large : 3,06) sont réduites.
// Les dimensions valent le double de l'affichage : assez pour un écran à haute densité, sans alourdir.
export const PHOTO_FRAMES: Record<PhotoShape, { width: number; height: number }> = {
  color: { width: 720, height: 600 },
  model: { width: 1200, height: 600 },
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
