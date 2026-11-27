import type { DiagramPoint, ProductKind, Variant } from "@/types/api";
import { diagramKindOf, zoneAt } from "./diagramShapes";

// Les zones du schéma d'un reconditionné (la « radiographie »), par sorte d'appareil.
export type Zone =
  | "screen"
  | "frontCamera"
  | "speaker"
  | "port"
  | "back"
  | "rearCamera"
  | "battery"
  | "frame"
  | "corners"
  | "keyboard"
  | "trackpad"
  | "palmRest"
  | "lid"
  | "case"
  | "band"
  | "caseBack";

// Chaque valeur des listes « Pièces remplacées » et « Défauts visibles » (CHOICES de l'API),
// reliée à sa zone pour chaque sorte. Une valeur absente d'ici ne va que dans la légende.
const PHONE_ZONES: Record<string, Zone> = {
  Écran: "screen",
  Afficheur: "screen",
  Batterie: "battery",
  "Caméra arrière": "rearCamera",
  "Caméra avant": "frontCamera",
  "Cache arrière": "back",
  "Haut-parleur": "speaker",
  "Connecteur de charge": "port",
  "Cache arrière fissuré": "back",
  "Rayures légères sur l'écran": "screen",
  "Rayures sur le cadre": "frame",
  "Coins marqués": "corners",
  "Pixel mort": "screen",
};

const ZONES: Partial<Record<ProductKind, Record<string, Zone>>> = {
  phone: PHONE_ZONES,
  // Une tablette se dessine comme un grand téléphone : mêmes pièces, mêmes zones.
  tablet: PHONE_ZONES,
  laptop: {
    Écran: "screen",
    Afficheur: "screen",
    Batterie: "battery",
    Clavier: "keyboard",
    "Pavé tactile": "trackpad",
    "Rayures légères sur l'écran": "screen",
    "Coins marqués": "lid",
    "Pixel mort": "screen",
    "Usure du repose-poignets": "palmRest",
  },
  watch: {
    Écran: "screen",
    Afficheur: "screen",
    Batterie: "caseBack",
    "Rayures légères sur l'écran": "screen",
    "Rayures sur le cadre": "case",
    "Coins marqués": "case",
    "Pixel mort": "screen",
  },
};

// La valeur est-elle dans la table des zones de cet appareil ? Sinon (une valeur ajoutée à la main), le gérant la place à la
// main sur le dessin (27/11).
export function hasZone(label: string, kind: ProductKind): boolean {
  return Boolean(ZONES[kind]?.[label]);
}

// Ce que le dessin montre pour une variante : les zones bleues (pièces), les zones à pastille rouge (défauts), les points
// posés à la main, et ce qui n'a ni zone ni point (la légende seule le dit).
export function zonesOf(
  variant: Pick<Variant, "replacedParts" | "defects" | "diagramMarks">,
  kind: ProductKind,
): { replaced: Zone[]; defects: Zone[]; replacedDots: DiagramPoint[]; defectDots: DiagramPoint[]; unplaced: string[] } {
  const table = ZONES[kind] ?? {};
  const diagram = diagramKindOf(kind);
  const unplaced: string[] = [];
  const replacedDots: DiagramPoint[] = [];
  const defectDots: DiagramPoint[] = [];

  const replaced = variant.replacedParts.flatMap((label) => {
    const zone = table[label];
    if (zone) return [zone];
    // Une pièce ajoutée à la main : la zone sous le point que le gérant a posé devient bleue (l'écran entier s'il a cliqué
    // sur l'écran) ; hors de toute zone (le cadre, un bord), la pièce est un point bleu.
    const mark = variant.diagramMarks?.parts[label];
    if (!mark) {
      unplaced.push(label);
      return [];
    }
    const under = zoneAt(diagram, mark);
    if (under) return [under];
    replacedDots.push(mark);
    return [];
  });

  const defects = variant.defects.flatMap((label) => {
    const zone = table[label];
    if (zone) return [zone];
    // Un défaut ajouté à la main : un point rouge exactement où le gérant l'a posé.
    const mark = variant.diagramMarks?.defects[label];
    if (mark) {
      defectDots.push(mark);
    } else {
      unplaced.push(label);
    }
    return [];
  });

  return { replaced, defects, replacedDots, defectDots, unplaced };
}
