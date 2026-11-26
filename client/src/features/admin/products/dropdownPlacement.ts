// Où ouvrir la liste d'un champ de recherche du formulaire (27/11, remarque de Mehdi) : tout en bas de la fenêtre, la liste
// (288 px) s'ouvrait vers le bas et était coupée par le cadre de la fenêtre (liste « Taille de l'écran » d'une coque, choix
// d'un modèle de téléphone). Elle s'ouvre maintenant du côté où il y a de la place, et sa hauteur ne dépasse jamais cette
// place : au-delà, elle défile.

const WANTED = 288;
const MARGIN = 12;
// Sous cette place libre dessous, on regarde dessus.
const MIN_BELOW = 160;
const MIN_HEIGHT = 96;

export type DropdownPlacement = { direction: "down" | "up"; maxHeight: number };

// `spaceBelow` et `spaceAbove` : les pixels libres sous et sur le champ, jusqu'au bord visible de la fenêtre qui le contient.
export function dropdownPlacement({ spaceBelow, spaceAbove }: { spaceBelow: number; spaceAbove: number }): DropdownPlacement {
  if (spaceBelow >= WANTED + MARGIN) {
    return { direction: "down", maxHeight: WANTED };
  }
  if (spaceAbove > spaceBelow && spaceBelow < MIN_BELOW + MARGIN) {
    return { direction: "up", maxHeight: Math.min(WANTED, Math.max(spaceAbove - MARGIN, MIN_HEIGHT)) };
  }
  if (spaceAbove > spaceBelow && spaceAbove >= WANTED) {
    return { direction: "up", maxHeight: WANTED };
  }
  return { direction: "down", maxHeight: Math.max(spaceBelow - MARGIN, MIN_HEIGHT) };
}

// Les pixels libres autour d'un champ : jusqu'au bord de sa fenêtre (`<dialog>`), ou de l'écran hors fenêtre.
export function spaceAround(field: HTMLElement): { spaceBelow: number; spaceAbove: number } {
  const box = field.getBoundingClientRect();
  const frame = field.closest("dialog")?.getBoundingClientRect();
  const top = Math.max(frame?.top ?? 0, 0);
  const bottom = Math.min(frame?.bottom ?? window.innerHeight, window.innerHeight);
  return { spaceBelow: bottom - box.bottom, spaceAbove: box.top - top };
}
