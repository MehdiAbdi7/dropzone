// Les règles de saisie de la page Pièces (18/11, atelier étape 1) : les mêmes bornes que l'API
// (server/src/modules/parts/part.schema.ts), dites en français avant l'envoi. Fonctions pures. Un champ vide
// est `NaN` : on ne l'envoie jamais comme 0.

const MAX_PRICE = 10_000_000;
const MAX_STOCK = 1_000_000;
const MAX_QUANTITY = 10_000;

const isInt = (value: number, min: number, max: number) => Number.isInteger(value) && value >= min && value <= max;

export type PartDraft = { name: string; purchasePrice: number; salePrice: number; stock: number };

export function partDraftProblem(draft: PartDraft): string | null {
  const name = draft.name.trim();
  if (name.length < 2) return "Le nom de la pièce : 2 caractères au minimum.";
  if (name.length > 80) return "Le nom de la pièce : 80 caractères au maximum.";
  if (!isInt(draft.purchasePrice, 0, MAX_PRICE)) return "Le prix d'achat : un nombre entier de dinars, de 0 à 10 000 000.";
  if (!isInt(draft.salePrice, 0, MAX_PRICE)) return "Le prix de vente : un nombre entier de dinars, de 0 à 10 000 000.";
  if (!isInt(draft.stock, 0, MAX_STOCK)) return "Le stock de départ : un nombre entier, de 0 à 1 000 000.";
  return null;
}

// En modification, le stock n'est pas un champ de la fenêtre : il ne doit pas empêcher d'enregistrer. On valide
// seulement le nom et les prix (le stock passe en « 0 », une valeur qui n'est jamais fautive).
export function partEditProblem(draft: { name: string; purchasePrice: number; salePrice: number }): string | null {
  return partDraftProblem({ ...draft, stock: 0 });
}

// Ce que « Modifier » envoie : SEULEMENT ce qui a changé. Le prix d'achat est une moyenne que chaque arrivage
// recalcule ; l'envoyer à chaque enregistrement écraserait un arrivage fait pendant que la fenêtre était ouverte,
// sans aucune trace dans le journal. `{}` : rien n'a changé.
export function partPatchBody(
  part: { name: string; purchasePrice: number; salePrice: number },
  draft: { name: string; purchasePrice: number; salePrice: number },
): { name?: string; purchasePrice?: number; salePrice?: number } {
  const name = draft.name.trim();
  return {
    ...(name !== part.name ? { name } : {}),
    ...(draft.purchasePrice !== part.purchasePrice ? { purchasePrice: draft.purchasePrice } : {}),
    ...(draft.salePrice !== part.salePrice ? { salePrice: draft.salePrice } : {}),
  };
}

export function arrivalProblem(draft: { quantity: number; unitCost: number }): string | null {
  if (!isInt(draft.quantity, 1, MAX_QUANTITY)) return "La quantité : un nombre entier, de 1 à 10 000.";
  // 0 DA est permis : les pièces récupérées sur un appareil démonté n'ont rien coûté.
  if (!isInt(draft.unitCost, 0, MAX_PRICE)) return "Le prix d'achat unitaire : un nombre entier de dinars, de 0 à 10 000 000.";
  return null;
}

// Le stock compté à la main : il doit différer du stock actuel, sinon il n'y a rien à corriger.
export function stockProblem(value: number, current: number): string | null {
  if (!isInt(value, 0, MAX_STOCK)) return "Le stock compté : un nombre entier, de 0 à 1 000 000.";
  if (value === current) return `Le stock est déjà de ${current}`;
  return null;
}

export const isOutOfStock = (part: { stock: number }): boolean => part.stock === 0;

export function movementLabel(movement: { kind: "arrival" | "correction"; delta: number }): string {
  if (movement.kind === "arrival") return `Arrivage de ${movement.delta}`;
  return `Correction : ${movement.delta > 0 ? "+" : "−"}${Math.abs(movement.delta)}`;
}

// Le prix d'achat moyen après un arrivage, montré avant de valider. La MÊME formule que l'API
// (server/src/modules/parts/partMath.ts) : l'API reste la référence, ceci n'est qu'un aperçu. Rien (null)
// tant que la saisie est incomplète.
export function averageAfterArrival(
  part: { stock: number; purchasePrice: number },
  arrival: { quantity: number; unitCost: number },
): number | null {
  if (arrivalProblem(arrival) !== null) return null;
  if (part.stock === 0) return arrival.unitCost;
  return Math.round((part.stock * part.purchasePrice + arrival.quantity * arrival.unitCost) / (part.stock + arrival.quantity));
}
