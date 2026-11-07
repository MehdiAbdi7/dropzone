import type { ProductKind, Variant } from "@/types/api";

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

export function zonesOf(
  variant: Pick<Variant, "replacedParts" | "defects">,
  kind: ProductKind,
): { replaced: Zone[]; defects: Zone[]; unplaced: string[] } {
  const table = ZONES[kind] ?? {};
  const unplaced: string[] = [];
  const place = (labels: string[]) =>
    labels.flatMap((label) => {
      const zone = table[label];
      if (!zone) {
        unplaced.push(label);
        return [];
      }
      return [zone];
    });
  const replaced = place(variant.replacedParts);
  const defects = place(variant.defects);
  return { replaced, defects, unplaced };
}
