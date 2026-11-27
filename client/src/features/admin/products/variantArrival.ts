import { averageAfterArrival } from "../parts/partsView";

// Un arrivage de neuf dans le back-office (27/11, demande de Mehdi), sans React : un neuf acheté à un autre prix reste UNE
// variante ; son stock augmente et son prix d'achat devient la moyenne pondérée (les mêmes règles que l'API, qui revérifie tout).

// Le plafond du stock d'une variante (celui de l'API).
export const MAX_VARIANT_STOCK = 10_000;

// Ce qui est tapé : des textes, un champ vide n'est pas 0.
export type ArrivalDraft = { quantity: string; unitCost: string; currentUnitCost: string };
export const emptyArrival: ArrivalDraft = { quantity: "", unitCost: "", currentUnitCost: "" };

type VariantNow = { stock: number; purchasePrice: number | null };

const toNumber = (text: string) => (text.trim() === "" ? Number.NaN : Number(text));
const isInt = (value: number, min: number, max: number) => Number.isInteger(value) && value >= min && value <= max;

// Du stock en rayon dont on ne connaît pas le prix d'achat : la moyenne n'aurait pas de sens, il faut le dire. Sans stock,
// il n'y a rien à moyenner ; avec un prix d'achat connu, on le prend.
export function needsCurrentCost(variant: VariantNow): boolean {
  return variant.stock > 0 && variant.purchasePrice === null;
}

// Ce qui ne va pas dans le formulaire (null si rien), dans l'ordre où le gérant remplit les champs.
export function arrivalProblem(variant: VariantNow, draft: ArrivalDraft): string | null {
  const quantity = toNumber(draft.quantity);
  if (!isInt(quantity, 1, 10_000)) return "La quantité reçue : un nombre entier, de 1 à 10 000.";
  if (variant.stock + quantity > MAX_VARIANT_STOCK) {
    return `Le stock ne peut pas dépasser ${MAX_VARIANT_STOCK} (il y en a déjà ${variant.stock}).`;
  }
  // 0 DA est permis : un lot offert.
  if (!isInt(toNumber(draft.unitCost), 0, 10_000_000)) return "Le prix d'achat unitaire : un nombre entier de dinars, de 0 à 10 000 000.";
  if (needsCurrentCost(variant) && !isInt(toNumber(draft.currentUnitCost), 0, 10_000_000)) {
    return "Le prix d'achat du stock actuel : un nombre entier de dinars, de 0 à 10 000 000.";
  }
  return null;
}

// Ce que donnera l'arrivage : le stock d'après et le prix d'achat moyen. null tant que le formulaire est incomplet.
export function arrivalPreview(variant: VariantNow, draft: ArrivalDraft): { stock: number; average: number } | null {
  if (arrivalProblem(variant, draft) !== null) return null;
  const quantity = toNumber(draft.quantity);
  const current = variant.purchasePrice ?? toNumber(draft.currentUnitCost);
  const average = averageAfterArrival({ stock: variant.stock, purchasePrice: Number.isNaN(current) ? 0 : current }, { quantity, unitCost: toNumber(draft.unitCost) });
  return average === null ? null : { stock: variant.stock + quantity, average };
}

// Ce que le formulaire envoie. Le prix du stock actuel ne part que s'il a été demandé.
export function arrivalBody(variant: VariantNow, draft: ArrivalDraft) {
  return {
    quantity: toNumber(draft.quantity),
    unitCost: toNumber(draft.unitCost),
    ...(needsCurrentCost(variant) ? { currentUnitCost: toNumber(draft.currentUnitCost) } : {}),
  };
}
