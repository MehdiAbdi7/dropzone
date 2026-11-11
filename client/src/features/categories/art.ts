import { placeOf, stagePhoto, type Box, type StageDevice } from "@/features/home/stageLayout";
import type { Category, CategoryPhoto, ProductKind } from "@/types/api";

// L'image d'une catégorie, la même partout (11/11) : l'accueil, la Boutique et la recherche
// dessinent la même composition de photos, réglée une seule fois dans Personnalisation. Ce
// fichier décide quelles photos et où ; `CategoryArt` les dessine.

// Les dessins de départ de chaque sorte de catégorie : le dernier recours, pour qu'une
// catégorie qui vient d'être créée ne soit jamais une tuile vide.
export const KIND_ICONS: Record<ProductKind, string> = {
  phone: "/products/phone.svg",
  tablet: "/products/tablet.svg",
  laptop: "/products/laptop.svg",
  watch: "/products/watch.svg",
  accessory: "/products/charger.svg",
  audiovisual: "/products/speaker.svg",
};

// La place de départ d'une photo qui n'a pas été bougée, dans le cadre 5:4 du socle (x : bord
// gauche, y : hauteur du bas, w : largeur, en %). Une photo seule est grande et centrée ; trois
// forment un groupe avec celle du milieu devant ; au-delà, elles s'étalent en alternant deux
// hauteurs. La case est carrée : sa hauteur fait w × 5/4, donc y + w × 5/4 reste sous 100.
export function defaultBox(index: number, count: number): Box {
  if (count <= 1) {
    return { x: 15, y: 10, w: 70, z: 1 };
  }
  if (count === 2) {
    return { x: index === 0 ? 2 : 46, y: 8, w: 52, z: index + 1 };
  }
  if (count === 3) {
    return [
      { x: 2, y: 14, w: 44, z: 1 },
      { x: 26, y: 4, w: 48, z: 2 },
      { x: 54, y: 14, w: 44, z: 1 },
    ][index];
  }
  return { x: index * (60 / (count - 1)), y: index % 2 === 0 ? 14 : 6, w: 40, z: index + 1 };
}

// ---------- Le cadrage automatique (11/11) ----------
// Une composition est réglée dans un cadre 5:4. Affichée telle quelle dans une tuile large et
// basse, ce cadre ne tient que par sa hauteur : la photo paraît minuscule. On calcule donc la
// zone que les photos occupent vraiment, puis `CategoryArt` agrandit le cadre jusqu'à ce que
// cette zone remplisse la place. Les positions réglées par le gérant ne changent pas, seule
// l'échelle change.
//
// Les mesures sont en largeurs de cadre (le cadre fait 1 de large et 0,8 de haut), y compté
// depuis le bas. Une case est carrée (w × w) ; la photo y est contenue et posée en bas
// (`object-contain object-bottom`) : une photo large n'occupe que le bas de sa case, une photo
// haute en occupe le milieu. `aspect` = largeur / hauteur de la photo, mesuré à son chargement.
const FRAME_HEIGHT = 0.8;

export type Bounds = { minX: number; minY: number; width: number; height: number };

export function contentBounds(items: { box: Box; aspect: number }[]): Bounds {
  if (items.length === 0) {
    return { minX: 0, minY: 0, width: 1, height: FRAME_HEIGHT };
  }
  const rects = items.map(({ box, aspect }) => {
    const side = box.w / 100;
    const left = box.x / 100;
    const bottom = (box.y / 100) * FRAME_HEIGHT;
    return aspect >= 1
      ? { left, bottom, width: side, height: side / aspect }
      : { left: left + (side - side * aspect) / 2, bottom, width: side * aspect, height: side };
  });
  const minX = Math.min(...rects.map((rect) => rect.left));
  const minY = Math.min(...rects.map((rect) => rect.bottom));
  const maxX = Math.max(...rects.map((rect) => rect.left + rect.width));
  const maxY = Math.max(...rects.map((rect) => rect.bottom + rect.height));
  // Jamais zéro : une division par zéro donnerait un cadre infini.
  return { minX, minY, width: Math.max(maxX - minX, 0.01), height: Math.max(maxY - minY, 0.01) };
}

// Les photos réglées d'une catégorie, chacune à sa place (celle de départ si le gérant ne l'a
// pas bougée). Une photo du gérant est déjà sans fond : Cloudinary coupe seulement le vide
// transparent autour (`stagePhoto`). L'éditeur du back-office n'utilise que celles-là.
export function compositionDevices(photos: CategoryPhoto[]): StageDevice[] {
  return photos.map((photo, index) => ({
    slot: photo.slot,
    src: stagePhoto(photo.url),
    box: placeOf(photo, defaultBox(index, photos.length)),
  }));
}

// Ce que la tuile d'une catégorie dessine : sa composition réglée ; sinon la photo de son
// produit le plus récent ; sinon l'icône de sa sorte.
export function categoryDevices(category: Pick<Category, "kind" | "photos" | "fallbackImage">): StageDevice[] {
  if (category.photos.length > 0) {
    return compositionDevices(category.photos);
  }
  return [{ slot: "fallback", src: category.fallbackImage ?? KIND_ICONS[category.kind], box: defaultBox(0, 1) }];
}
