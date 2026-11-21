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
// sans aucune trace dans le journal. `{}` : rien n'a changé. La catégorie (21/11) change une pièce de rayon.
export function partPatchBody(
  part: { name: string; purchasePrice: number; salePrice: number; categoryId?: number },
  draft: { name: string; purchasePrice: number; salePrice: number; categoryId?: number },
): { name?: string; purchasePrice?: number; salePrice?: number; categoryId?: number } {
  const name = draft.name.trim();
  return {
    ...(name !== part.name ? { name } : {}),
    ...(draft.categoryId !== undefined && draft.categoryId !== part.categoryId ? { categoryId: draft.categoryId } : {}),
    ...(draft.purchasePrice !== part.purchasePrice ? { purchasePrice: draft.purchasePrice } : {}),
    ...(draft.salePrice !== part.salePrice ? { salePrice: draft.salePrice } : {}),
  };
}

// Les catégories de pièces (21/11) : Batterie, Afficheur… Les bornes sont celles de l'API (part.schema.ts).
export type PartCategoryRow = { id: number; name: string; partsCount: number };

export function categoryNameProblem(name: string): string | null {
  const length = name.trim().length;
  if (length < 1) return "Le nom de la catégorie : 1 caractère au minimum.";
  if (length > 40) return "Le nom de la catégorie : 40 caractères au maximum.";
  return null;
}

// Créer une pièce commence par le choix de sa catégorie.
export function categoryChoiceProblem(categoryId: number | null): string | null {
  return categoryId === null ? "Choisis la catégorie de la pièce." : null;
}

// La catégorie ouverte sur la page : celle qu'on a choisie si elle existe encore, sinon la première (la catégorie vient
// d'être supprimée, ou rien n'est choisi). Aucune catégorie : rien.
export function activeCategoryId(categories: { id: number }[], wanted: number | null): number | null {
  if (wanted !== null && categories.some((category) => category.id === wanted)) return wanted;
  return categories[0]?.id ?? null;
}

// Sans accents ni majuscules : « ecran » trouve « Écran iPhone 13 » (comme la recherche de l'API).
const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

// Ce que montre la page : les pièces de la catégorie ouverte ; dès qu'on tape une recherche, celles de TOUTES les
// catégories (une pièce rangée ailleurs reste trouvable).
export function visibleParts<T extends { name: string; categoryId: number }>(parts: T[], categoryId: number | null, search: string): T[] {
  const needle = normalize(search.trim());
  if (needle) return parts.filter((part) => normalize(part.name).includes(needle));
  return parts.filter((part) => part.categoryId === categoryId);
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

export type PartMovementKind = "arrival" | "correction" | "repair" | "repair_return" | "salvage" | "trade_in_use";

export const isOutOfStock =(part: { stock: number }): boolean => part.stock === 0;

export function movementLabel(movement: { kind: PartMovementKind; delta: number }): string {
  if (movement.kind === "arrival") return `Arrivage de ${movement.delta}`;
  const signed = `${movement.delta > 0 ? "+" : "−"}${Math.abs(movement.delta)}`;
  // Sorties et retours d'une réparation (étape 2) : la fiche est dans la note du mouvement (« R-1001 »).
  if (movement.kind === "repair") return `Réparation : ${signed}`;
  if (movement.kind === "repair_return") return `Retour de réparation : ${signed}`;
  // Étape 6 : les pièces d'une reprise démontée entrent au stock, et une pièce sert à remettre une reprise en état.
  if (movement.kind === "salvage") return `Pièces récupérées : ${signed}`;
  if (movement.kind === "trade_in_use") return `Remise en état d'une reprise : ${signed}`;
  return `Correction : ${signed}`;
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
