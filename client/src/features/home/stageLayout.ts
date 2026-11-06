// La disposition du socle de l'accueil, sans React (06/11). Le gérant envoie une photo sans
// fond par emplacement (back-office › Accueil), puis la déplace et la redimensionne à la
// souris ou au doigt. Chaque emplacement a une place de départ, pensée pour voir chaque
// catégorie : l'ordinateur au fond, la tablette à gauche, le smartphone à droite, et 4
// accessoires en rang devant. Tout est en % du cadre (5:4), donc juste à toutes les tailles.

// La place d'une photo : `x` son bord gauche, `y` la hauteur de son bas, `w` sa largeur (en %
// du cadre), `z` son ordre (plus grand = devant). La case est carrée : sa hauteur fait w × 5/4
// en % de la hauteur du cadre.
export type Box = { x: number; y: number; w: number; z: number };

// Ce que l'API renvoie pour une photo : null sur x, y, w ou z = la place de départ.
export type StagePhoto = { url: string; x: number | null; y: number | null; w: number | null; z: number | null };

export type StagePhotos = {
  hero: Record<"laptop" | "phone" | "tablet" | "accessory1" | "accessory2" | "accessory3" | "accessory4", StagePhoto | null>;
  deal: Record<"left" | "center" | "right", StagePhoto | null>;
};

export type StageDevice = { slot: string; src: string; box: Box };

export const HERO_SLOTS: { slot: keyof StagePhotos["hero"]; label: string; box: Box }[] = [
  { slot: "laptop", label: "Ordinateur portable", box: { x: 16, y: 25, w: 68, z: 1 } },
  { slot: "tablet", label: "Tablette", box: { x: 0, y: 17, w: 42, z: 2 } },
  { slot: "phone", label: "Smartphone", box: { x: 58, y: 16, w: 42, z: 3 } },
  // Le rang de devant suit la courbe du bord du socle : plus bas au centre qu'aux côtés.
  { slot: "accessory1", label: "Accessoire 1", box: { x: 3, y: 9, w: 25, z: 4 } },
  { slot: "accessory2", label: "Accessoire 2", box: { x: 26, y: 4, w: 25, z: 4 } },
  { slot: "accessory3", label: "Accessoire 3", box: { x: 49, y: 4, w: 25, z: 4 } },
  { slot: "accessory4", label: "Accessoire 4", box: { x: 72, y: 9, w: 25, z: 4 } },
];

// Les illustrations de départ du hero, gardées tant qu'aucune photo n'est envoyée : un socle
// à moitié vide ferait moins bien que les dessins.
const HERO_DEFAULT: StageDevice[] = [
  { slot: "charger", src: "/products/charger.svg", box: { x: 19, y: 33, w: 22, z: 0 } },
  { slot: "watch", src: "/products/watch.svg", box: { x: 4, y: 16, w: 30, z: 1 } },
  { slot: "phone", src: "/products/phone.svg", box: { x: 26, y: 15, w: 48, z: 2 } },
  { slot: "earbuds", src: "/products/earbuds.svg", box: { x: 66, y: 16, w: 30, z: 1 } },
];

export const DEAL_SLOTS: { slot: keyof StagePhotos["deal"]; label: string; box: Box; fallback: string }[] = [
  { slot: "left", label: "À gauche", box: { x: 6, y: 16, w: 30, z: 1 }, fallback: "/products/charger.svg" },
  { slot: "center", label: "Au centre", box: { x: 26, y: 15, w: 48, z: 2 }, fallback: "/products/phone.svg" },
  { slot: "right", label: "À droite", box: { x: 64, y: 16, w: 30, z: 1 }, fallback: "/products/earbuds.svg" },
];

// Une photo du gérant, sans le vide transparent qui l'entoure souvent après un détourage :
// Cloudinary le coupe à l'affichage (`e_trim`), l'objet remplit alors sa case. Les dessins
// et les autres adresses restent tels quels.
export function stagePhoto(url: string): string {
  return url.startsWith("https://res.cloudinary.com/") ? url.replace("/image/upload/", "/image/upload/e_trim/") : url;
}

// La place enregistrée si elle est complète, sinon celle de départ.
function placeOf(photo: StagePhoto, start: Box): Box {
  const { x, y, w, z } = photo;
  return x !== null && y !== null && w !== null ? { x, y, w, z: z ?? start.z } : start;
}

export function heroDevices(photos: StagePhotos | null): StageDevice[] {
  const filled = HERO_SLOTS.flatMap(({ slot, box }) => {
    const photo = photos?.hero[slot];
    return photo ? [{ slot, src: stagePhoto(photo.url), box: placeOf(photo, box) }] : [];
  });
  return filled.length > 0 ? filled : HERO_DEFAULT;
}

// Le bandeau des affaires : 3 emplacements, chacun garde son illustration tant qu'il est vide.
export function dealDevices(photos: StagePhotos | null): StageDevice[] {
  return DEAL_SLOTS.map(({ slot, box, fallback }) => {
    const photo = photos?.deal[slot];
    return photo ? { slot, src: stagePhoto(photo.url), box: placeOf(photo, box) } : { slot, src: fallback, box };
  });
}

// ---------- L'éditeur du back-office ----------

const MIN_W = 8;
const MAX_W = 80;
// Le bas d'une photo ne monte pas plus haut : au-delà, elle flotterait au-dessus du décor.
// (Pas la hauteur du carré : un ordinateur, plus large que haut, n'en occupe que le bas.)
const MAX_Y = 75;
const round = (value: number) => Math.round(value * 10) / 10;
const between = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

// Une photo reste dans la largeur du cadre, ni minuscule ni plus large que le socle.
export function clampBox(box: Box): Box {
  const w = round(between(box.w, MIN_W, MAX_W));
  return { x: round(between(box.x, 0, 100 - w)), y: round(between(box.y, 0, MAX_Y)), w, z: box.z };
}

// Glisser de dx % vers la droite et dy % vers le haut.
export function moveBox(box: Box, dx: number, dy: number): Box {
  return clampBox({ ...box, x: box.x + dx, y: box.y + dy });
}

// Agrandir ou réduire autour du milieu du bas de la photo : elle reste posée au même endroit.
export function resizeBox(box: Box, w: number): Box {
  return clampBox({ ...box, x: box.x + (box.w - w) / 2, w });
}

// Mettre une photo devant (ou derrière) toutes les autres, puis renuméroter de 1 à n.
export function reorder(boxes: Record<string, Box>, slot: string, where: "front" | "back"): Record<string, Box> {
  const others = Object.keys(boxes)
    .filter((key) => key !== slot)
    .sort((a, b) => boxes[a].z - boxes[b].z);
  const order = where === "front" ? [...others, slot] : [slot, ...others];
  return Object.fromEntries(order.map((key, index) => [key, { ...boxes[key], z: index + 1 }]));
}
