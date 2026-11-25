import { invalidWarranty, missingBox, missingPartOrigins, type VariantDraft } from "./productDraft";

// La fenêtre d'une variante en onglets (25/11, demande de Mehdi : « une organisation parfaite ») : un onglet par
// thème, un seul visible à la fois. Chaque onglet porte ses propres problèmes, pour que le gérant voie tout de suite
// où corriger sans ouvrir les cinq. Les règles sont celles de `variantProblems` (variantGroups.ts), rangées par onglet.
export type VariantTabId = "features" | "price" | "state" | "refs" | "gifts";

export type VariantTab = { id: VariantTabId; label: string; problems: string[] };

export function variantTabs(variant: VariantDraft, { lockedColor }: { lockedColor: boolean }): VariantTab[] {
  const refurbished = variant.condition === "refurbished";
  const tabs: (VariantTab | null)[] = [
    { id: "features", label: "Caractéristiques", problems: [] },
    { id: "price", label: "Prix et stock", problems: variant.price ? [] : ["prix"] },
    refurbished
      ? {
          id: "state",
          label: "État",
          problems: [
            missingBox(variant) ? "boîte à choisir" : null,
            missingPartOrigins(variant).length > 0 ? "origine des pièces" : null,
          ].filter((problem): problem is string => problem !== null),
        }
      : null,
    { id: "refs", label: "Références", problems: invalidWarranty(variant) ? ["garantie"] : [] },
    // La page d'une couleur du Catalogue n'offre pas d'articles : la couleur y est imposée.
    lockedColor ? null : { id: "gifts", label: "Cadeaux", problems: [] },
  ];
  return tabs.filter((tab): tab is VariantTab => tab !== null);
}

// La marge sur le prix de vente, en pourcentage entier (100 000 vendu, 80 000 payé : 20). Négative sous le prix
// d'achat. Null tant qu'un des deux prix manque : pas de marge inventée.
export function marginPercent(price: string, purchasePrice: string): number | null {
  const sale = Number(price);
  const cost = Number(purchasePrice);
  if (!price || !purchasePrice || !(sale > 0)) {
    return null;
  }
  return Math.round(((sale - cost) / sale) * 100);
}
