import { type Palette, swatchOf } from "@/config/colors";

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

// Le mot sous une colonne grisée de l'affiche. Toute la série reste visible : un modèle
// sans fiche publiée n'est « pas encore en vente », un modèle sans stock est « épuisé ».
export function posterStatus(model: { onSale: boolean; soldOut: boolean }): string | null {
  if (!model.onSale) {
    return "Pas encore en vente";
  }
  return model.soldOut ? "Épuisé" : null;
}

export function ctaLabel(seriesName: string): string {
  return `Acheter un ${seriesName}`;
}

const NEUTRAL_GLOW = "rgba(155, 77, 255, 0.35)";

// La lueur derrière la photo d'un modèle : la teinte de sa couleur (palette réglée dans
// Listes), éclaircie de 25 % vers le blanc (un bordeaux pur se perdrait dans le fond noir).
// Couleur sans teinte : violet neutre.
export function glowColor(colorName: string | null, palette: Palette): string {
  const hex = colorName ? swatchOf(colorName, palette) : null;
  if (!hex) {
    return NEUTRAL_GLOW;
  }
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16);
    return Math.round(channel + (255 - channel) * 0.25);
  });
  return `rgba(${r}, ${g}, ${b}, 0.6)`;
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
