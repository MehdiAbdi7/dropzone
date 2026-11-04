// La teinte de chaque couleur (« Orange » → « #f47d3c ») : réglée par le gérant dans Listes,
// servie par l'API (GET /colors pour la boutique, GET /admin/choices pour le back-office).
// Avant le 04/11, elle était écrite ici, et une couleur ajoutée par le gérant n'avait ni
// pastille ni lueur. Une couleur sans teinte s'affiche par son nom : on ne devine pas.
export type Palette = Record<string, string>;

export function swatchOf(name: string, palette: Palette): string | null {
  return palette[name] ?? null;
}

// La palette du back-office, tirée de la liste « Couleurs » (les valeurs sans teinte en sont absentes).
export function paletteFromChoices(colors: { label: string; hex: string | null }[] | undefined): Palette {
  return Object.fromEntries((colors ?? []).flatMap((color) => (color.hex ? [[color.label, color.hex]] : [])));
}
