import { swatchOf, type Palette } from "@/config/colors";

// La logique de la carte d'un modèle dans une série (24/11), sans React pour être testée.

// Toujours le nombre de neufs et d'occasions, même sans fiche produit (deux zéros) : la carte garde sa forme.
export function modelCounts(product: { newStock: number; dealCount: number } | null): { newStock: number; deals: number } {
  return { newStock: product?.newStock ?? 0, deals: product?.dealCount ?? 0 };
}

// Le reflet de l'affiche (la lueur) : celui choisi s'il est dans les couleurs du modèle, sinon la première couleur,
// comme le fait la boutique. Rien sans couleur.
export function effectiveGlow(colors: string[], posterColor: string | null): string | null {
  if (posterColor && colors.includes(posterColor)) return posterColor;
  return colors[0] ?? null;
}

export type ModelColor = { name: string; photoUrl: string | null; newStock: number; refurbishedCount: number };
export type ColorRow = ModelColor & { hex: string | null; missingPhoto: boolean; missingHue: boolean };

// Les couleurs d'un modèle pour la fenêtre « Couleurs et photos » : la teinte réglée dans Listes (null = pas réglée, on
// ne la devine pas) et ce qui manque, la photo et la teinte.
export function colorRows(colors: ModelColor[], palette: Palette): ColorRow[] {
  return colors.map((color) => {
    const hex = swatchOf(color.name, palette);
    return { ...color, hex, missingPhoto: color.photoUrl === null, missingHue: hex === null };
  });
}

// Ce que dit la tuile « Couleurs et photos » de la fiche produit.
export function colorsSummary(rows: { missingPhoto: boolean }[]): { text: string; state: "done" | "todo" } {
  if (rows.length === 0) return { text: "Aucune couleur", state: "todo" };
  const missing = rows.filter((row) => row.missingPhoto).length;
  const count = `${rows.length} couleur${rows.length > 1 ? "s" : ""}`;
  return missing === 0 ? { text: `${count} · toutes avec photo`, state: "done" } : { text: `${count} · ${missing} sans photo`, state: "todo" };
}
