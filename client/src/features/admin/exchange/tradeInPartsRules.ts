// Les pièces d'une reprise (atelier, étape 6) : fonctions pures, sans écran ni réseau. Les bornes sont celles de l'API
// (server/src/modules/exchanges/exchange.schema.ts) ; l'API reste la référence.

const MAX_QUANTITY = 100;

// Une ligne de la fenêtre de démontage : la pièce choisie (null tant qu'on n'a pas choisi) et la quantité tapée.
export type SalvageLine = { partId: number | null; quantity: string };

// Ce que « Démonter pour pièces » envoie : les lignes remplies, la même pièce additionnée. `error` dit pourquoi on ne peut
// pas valider (une quantité hors bornes, ou aucune pièce).
export function dismantleBody(lines: SalvageLine[]): { parts: { partId: number; quantity: number }[]; error: string | null } {
  const totals = new Map<number, number>();
  for (const line of lines) {
    if (line.partId === null && line.quantity.trim() === "") continue;
    const quantity = /^\d+$/.test(line.quantity.trim()) ? Number(line.quantity) : Number.NaN;
    if (line.partId === null || Number.isNaN(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return { parts: [], error: `Chaque pièce récupérée : une pièce et une quantité de 1 à ${MAX_QUANTITY}.` };
    }
    totals.set(line.partId, (totals.get(line.partId) ?? 0) + quantity);
  }
  const parts = [...totals.entries()].map(([partId, quantity]) => ({ partId, quantity }));
  // Deux lignes de la même pièce peuvent dépasser la borne une fois additionnées.
  if (parts.some((part) => part.quantity > MAX_QUANTITY)) {
    return { parts: [], error: `Une pièce récupérée : une quantité de 1 à ${MAX_QUANTITY} en tout.` };
  }
  if (parts.length === 0) return { parts: [], error: "Choisissez au moins une pièce récupérée." };
  return { parts, error: null };
}

// « Utiliser une pièce » pour remettre une reprise en état : la pièce, une quantité entière, pas plus que le stock.
export function usePartProblem(part: { name: string; stock: number } | null, quantityText: string): string | null {
  if (!part) return "Choisissez la pièce utilisée.";
  const quantity = /^\d+$/.test(quantityText.trim()) ? Number(quantityText) : Number.NaN;
  if (Number.isNaN(quantity) || quantity < 1 || quantity > MAX_QUANTITY) return `La quantité : un nombre entier de 1 à ${MAX_QUANTITY}.`;
  if (quantity > part.stock) return `Stock insuffisant : « ${part.name} » (il en reste ${part.stock}, il en faut ${quantity}).`;
  return null;
}
