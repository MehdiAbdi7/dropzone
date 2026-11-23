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

// Les variantes d'une liste, regroupées par couleur (23/11 : les couleurs se repéraient mal) : dans l'ordre où la
// couleur apparaît dans la fiche, avec le stock de chaque couleur ; les variantes sans couleur ferment la liste.
export type ColorGroup = { color: string | null } & VariantGroup;

export function byColor(variants: VariantDraft[]): ColorGroup[] {
  const order: (string | null)[] = [];
  const members = new Map<string | null, VariantDraft[]>();
  for (const variant of variants) {
    const color = variant.options.Couleur?.trim() || null;
    if (!members.has(color)) {
      order.push(color);
      members.set(color, []);
    }
    members.get(color)!.push(variant);
  }
  const sorted = [...order.filter((color) => color !== null), ...order.filter((color) => color === null)];
  return sorted.map((color) => ({ color, ...groupOf(members.get(color)!) }));
}

// Ce que dit la ligne d'une variante sous l'en-tête de sa couleur : les autres options, le stockage d'abord (c'est ce
// qui distingue le plus souvent deux variantes de la même couleur).
export function optionsWithoutColor(variant: VariantDraft): string {
  const entries = Object.entries(variant.options).filter(([key, value]) => key !== "Couleur" && value);
  const storage = entries.filter(([key]) => key === "Stockage");
  const others = entries.filter(([key]) => key !== "Stockage");
  return [...storage, ...others].map(([, value]) => value).join(" · ");
}
