import { swatchOf } from "@/config/colors";

// Les petits calculs des affiches de séries, sans React : testés avec Vitest.

// « l'iPhone », « l'iPad », mais « le Galaxy », « le MacBook », « le HP » (h aspiré).
const ELIDES = /^[aeiouàâéèêëîïôöûü]/i;

export function withArticle(name: string): string {
  return ELIDES.test(name) ? `l'${name}` : `le ${name}`;
}

// Le texte sous l'affiche à glisser : vers le modèle suivant, ou retour au précédent
// quand on est sur le dernier. Rien à dire pour une série d'un seul modèle.
export function swipeHint(names: string[], index: number): { text: string; back: boolean } | null {
  if (names.length < 2) {
    return null;
  }
  if (index < names.length - 1) {
    return { text: `Glisse pour voir ${withArticle(names[index + 1])}`, back: false };
  }
  const previous = names[index - 1];
  return { text: ELIDES.test(previous) ? `Revenir à l'${previous}` : `Revenir au ${previous}`, back: true };
}

export function ctaLabel(seriesName: string): string {
  return `Acheter un ${seriesName}`;
}

const NEUTRAL_GLOW = "rgba(155, 77, 255, 0.35)";

// La lueur derrière la photo d'un modèle : la pastille de sa couleur, éclaircie de 25 %
// vers le blanc (un bordeaux pur se perdrait dans le fond noir). Couleur inconnue : violet.
export function glowColor(colorName: string | null): string {
  const hex = colorName ? swatchOf(colorName) : null;
  if (!hex) {
    return NEUTRAL_GLOW;
  }
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16);
    return Math.round(channel + (255 - channel) * 0.25);
  });
  return `rgba(${r}, ${g}, ${b}, 0.6)`;
}

// La place à laisser après le dernier modèle (marge comprise) pour qu'il puisse venir se
// caler à gauche comme les autres : sans elle, la piste s'arrête quand il touche le bord
// droit, et sur ordinateur (3 modèles visibles) les derniers ne deviennent jamais « actifs ».
export function trackEndPadding(trackWidth: number, slideWidth: number, startPadding: number): number {
  return Math.max(0, Math.round(trackWidth - slideWidth - startPadding));
}

// Sur ordinateur, jusqu'à 4 colonnes côte à côte ; au-delà, on glisse comme sur téléphone.
export function posterLayout(count: number): "columns" | "slider" {
  return count <= 4 ? "columns" : "slider";
}

export type SpecIcon = "screen" | "chip" | "camera" | "battery" | "plug" | "memory" | "storage" | "gpu" | "dot";

const SPEC_ICONS: Record<string, SpecIcon> = {
  Écran: "screen",
  Puce: "chip",
  Processeur: "chip",
  "Appareil photo": "camera",
  Batterie: "battery",
  Autonomie: "battery",
  Connecteur: "plug",
  Ports: "plug",
  RAM: "memory",
  Stockage: "storage",
  "Carte graphique": "gpu",
};

export function specIcon(key: string): SpecIcon {
  return SPEC_ICONS[key] ?? "dot";
}
