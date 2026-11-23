import { invalidWarranty, missingBox, missingPartOrigins, type VariantDraft } from "./productDraft";

// La fiche produit en fenêtres (23/11) : le neuf scellé et l'occasion ne se mélangent plus, chaque liste a son titre,
// son stock total et son bouton d'ajout.
export type VariantGroup = { variants: VariantDraft[]; stock: number };

const groupOf = (variants: VariantDraft[]): VariantGroup => ({
  variants,
  stock: variants.reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0),
});

export function variantGroups(variants: VariantDraft[]): { fresh: VariantGroup; used: VariantGroup } {
  return {
    fresh: groupOf(variants.filter((variant) => variant.condition === "new")),
    used: groupOf(variants.filter((variant) => variant.condition === "refurbished")),
  };
}

// Ce qui bloquera l'envoi, signalé sur la ligne de la variante avant même d'enregistrer.
export function variantProblems(variant: VariantDraft): string[] {
  return [
    missingBox(variant) ? "boîte à choisir" : null,
    missingPartOrigins(variant).length > 0 ? "origine des pièces" : null,
    invalidWarranty(variant) ? "garantie" : null,
    !variant.price ? "prix" : null,
  ].filter((problem): problem is string => problem !== null);
}
