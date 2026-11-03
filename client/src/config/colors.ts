// La teinte de la pastille de chaque couleur (liste « Couleurs » du back-office).
// Une couleur absente d'ici s'affiche sans pastille, seulement son nom : on ne devine pas.
const SWATCHES: Record<string, string> = {
  Noir: "#1d1d1f",
  Blanc: "#f5f5f0",
  Bleu: "#3a5f9e",
  Rouge: "#c8102e",
  Vert: "#4b7a5a",
  Rose: "#f2c4ce",
  Violet: "#6e5a8c",
  Jaune: "#f3d65c",
  Argent: "#d9d9de",
  "Gris sidéral": "#535150",
  Minuit: "#232a35",
  "Lumière stellaire": "#ece5d8",
  "Titane naturel": "#bfb6a8",
  "Titane noir": "#3c3c3d",
  "Titane bleu": "#3c4a63",
  "Titane blanc": "#efeee9",
  "Titane gris": "#8a8a87",
  Graphite: "#41424c",
  Bordeaux: "#6b1f2e",
  Glacier: "#cfe3ee",
};

export function swatchOf(name: string): string | null {
  return SWATCHES[name] ?? null;
}
