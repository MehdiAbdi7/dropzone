// Les règles pures du remplacement sous garantie (atelier, étape 6, cahier §7 et §14) : sans base ni réseau.

// Le stockage d'une variante ou d'un article vendu : l'option « Stockage » (« 256 Go »), absente pour un PC.
export function storageOf(options: unknown): string | null {
  const value = (options as Record<string, unknown> | null)?.Stockage;
  return typeof value === "string" ? value : null;
}

// « Même modèle » : même produit ET même stockage, la couleur étant libre. Un 128 Go remplacé par un 256 Go n'est
// PAS le même modèle : on compare alors avec le prix payé, sinon le client gagnerait un appareil plus cher gratuitement.
// Un article d'origine sans produit (le produit a été supprimé du catalogue) n'est jamais « le même ».
export function isSameModel(
  origin: { productId: number | null; storage: string | null },
  given: { productId: number; storage: string | null },
): boolean {
  return origin.productId !== null && origin.productId === given.productId && origin.storage === given.storage;
}

// Ce que le client paie (positif) ou ce que le magasin lui rend (négatif). Même modèle : rien, quel que soit le prix
// catalogue d'aujourd'hui. Sinon : le prix de l'appareil donné moins le prix PAYÉ à l'achat (le prix accordé sur la
// commande d'origine, pas le catalogue).
export function replacementDifference(input: { sameModel: boolean; paidPrice: number; givenPrice: number }): number {
  return input.sameModel ? 0 : input.givenPrice - input.paidPrice;
}

// Le résultat du magasin : ce qu'il encaisse (ou rend) moins ce que l'appareil donné lui a coûté. Jamais
// « prix de l'appareil donné − prix d'achat » : le client ne paie pas cet appareil.
export const replacementProfit = (difference: number, givenCost: number): number => difference - givenCost;
