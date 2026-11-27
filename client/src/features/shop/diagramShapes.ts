import type { DiagramPoint, ProductKind } from "@/types/api";
import type { Zone } from "./diagramZones";

// La géométrie du dessin d'un reconditionné (la « radiographie »), sans React : la forme de chaque zone et l'endroit de sa
// pastille. DeviceDiagram les dessine ; `zoneAt` dit quelle zone est sous un point (27/11, pour une pièce posée à la main).
// Tout est dans un repère de 220 sur 200 (le `viewBox` du dessin), le même pour tous les appareils.

export const DIAGRAM_WIDTH = 220;
export const DIAGRAM_HEIGHT = 200;

export type DiagramKind = "phone" | "tablet" | "laptop" | "watch";

// Le dessin d'un produit : un téléphone par défaut (une sorte sans dessin à elle, comme un accessoire, ne s'affiche pas ici).
export function diagramKindOf(kind: ProductKind): DiagramKind {
  return kind === "tablet" || kind === "laptop" || kind === "watch" ? kind : "phone";
}

// La forme d'une zone (null : rien à dessiner, seulement un point pour un défaut) et
// l'endroit où poser la pastille rouge d'un défaut.
export type Shape =
  | { type: "rect"; x: number; y: number; w: number; h: number; r: number; dashed?: boolean }
  | { type: "circle"; cx: number; cy: number; r: number }
  | null;
export type ZoneShape = { shape: Shape; dot: [number, number] };

const rect = (x: number, y: number, w: number, h: number, r: number, dashed = false): Shape => ({
  type: "rect",
  x,
  y,
  w,
  h,
  r,
  dashed,
});

// Téléphone : la face à gauche (x 10 à 100), le dos à droite (x 120 à 210).
// Dans l'ordre du dessin : les grandes zones d'abord, les petites par-dessus.
const PHONE: [Zone, ZoneShape][] = [
  ["screen", { shape: rect(16, 16, 78, 168, 9), dot: [55, 110] }],
  ["speaker", { shape: rect(45, 11, 20, 3, 1.5), dot: [55, 12] }],
  ["frontCamera", { shape: { type: "circle", cx: 55, cy: 26, r: 4 }, dot: [55, 26] }],
  ["port", { shape: rect(47, 187, 16, 4, 2), dot: [55, 189] }],
  ["frame", { shape: null, dot: [100, 70] }],
  ["corners", { shape: null, dot: [16, 186] }],
  ["back", { shape: rect(126, 16, 78, 168, 9), dot: [178, 150] }],
  ["battery", { shape: rect(140, 68, 50, 92, 6, true), dot: [165, 114] }],
  ["rearCamera", { shape: rect(130, 20, 36, 36, 9), dot: [148, 38] }],
];

// Tablette : les mêmes pièces que le téléphone, en proportions de tablette (3:4) ;
// la face à gauche (x 6 à 104), le dos à droite (x 116 à 214).
const TABLET: [Zone, ZoneShape][] = [
  ["screen", { shape: rect(12, 41, 86, 118, 4), dot: [55, 100] }],
  ["speaker", { shape: rect(7, 92, 2.5, 16, 1.2), dot: [8, 100] }],
  ["frontCamera", { shape: { type: "circle", cx: 55, cy: 37.5, r: 2.5 }, dot: [55, 37.5] }],
  ["port", { shape: rect(47, 162, 16, 3, 1.5), dot: [55, 164] }],
  ["frame", { shape: null, dot: [104, 70] }],
  ["corners", { shape: null, dot: [10, 162] }],
  ["back", { shape: rect(121, 40, 88, 120, 10), dot: [178, 140] }],
  ["battery", { shape: rect(138, 70, 54, 70, 6, true), dot: [165, 105] }],
  ["rearCamera", { shape: rect(124, 43, 20, 20, 6), dot: [134, 53] }],
];

// PC portable ouvert : l'écran (capot) en haut, la base en bas.
const LAPTOP: [Zone, ZoneShape][] = [
  ["lid", { shape: rect(40, 8, 140, 96, 8), dot: [52, 18] }],
  ["screen", { shape: rect(48, 16, 124, 80, 4), dot: [110, 56] }],
  ["keyboard", { shape: rect(42, 116, 136, 34, 4), dot: [110, 133] }],
  ["trackpad", { shape: rect(88, 156, 44, 26, 4), dot: [110, 169] }],
  ["palmRest", { shape: null, dot: [60, 172] }],
  ["battery", { shape: rect(140, 158, 34, 22, 3, true), dot: [157, 169] }],
];

// Montre : la face à gauche (bracelet, boîtier, écran), le dos du boîtier à droite.
const WATCH: [Zone, ZoneShape][] = [
  ["band", { shape: rect(38, 10, 44, 180, 14), dot: [60, 24] }],
  ["case", { shape: rect(26, 52, 68, 96, 20), dot: [92, 100] }],
  ["screen", { shape: rect(34, 60, 52, 80, 14), dot: [60, 100] }],
  ["caseBack", { shape: { type: "circle", cx: 160, cy: 100, r: 40 }, dot: [160, 100] }],
];

export const DIAGRAM_ZONES: Record<DiagramKind, [Zone, ZoneShape][]> = {
  phone: PHONE,
  tablet: TABLET,
  laptop: LAPTOP,
  watch: WATCH,
};

// La marge, dans le repère du dessin, autour d'une zone : un clic juste à côté d'une petite zone (un haut-parleur de
// 3 de haut) la touche quand même.
const TOLERANCE = 2;

// La zone sous un point : la plus petite, donc la dernière dessinée (les petites zones sont dessinées par-dessus les
// grandes). Une zone sans forme (le cadre, les coins) ne peut pas être touchée : null, et le point reste un point.
export function zoneAt(kind: DiagramKind, point: DiagramPoint): Zone | null {
  const zones = DIAGRAM_ZONES[kind];
  for (let index = zones.length - 1; index >= 0; index--) {
    const [zone, { shape }] = zones[index];
    if (!shape) continue;
    if (shape.type === "rect") {
      const inside =
        point.x >= shape.x - TOLERANCE &&
        point.x <= shape.x + shape.w + TOLERANCE &&
        point.y >= shape.y - TOLERANCE &&
        point.y <= shape.y + shape.h + TOLERANCE;
      if (inside) return zone;
    } else if (Math.hypot(point.x - shape.cx, point.y - shape.cy) <= shape.r + TOLERANCE) {
      return zone;
    }
  }
  return null;
}
