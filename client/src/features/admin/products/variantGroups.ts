import { invalidWarranty, missingBox, missingPartOrigins, type VariantDraft } from "./productDraft";

// La fiche produit en fenêtres (23/11) : le neuf scellé et l'occasion ne se mélangent plus, chaque liste a sa tuile et
// sa fenêtre. `stock` est ce qu'on peut vendre : une variante en brouillon ne le grossit pas (24/11), on la compte à
// part dans `drafts`.
export type VariantGroup = { variants: VariantDraft[]; stock: number; drafts: number };

const groupOf = (variants: VariantDraft[]): VariantGroup => ({
  variants,
  stock: variants.reduce((sum, variant) => sum + (variant.status === "draft" ? 0 : Number(variant.stock) || 0), 0),
  drafts: variants.filter((variant) => variant.status === "draft").length,
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

// Ce que dit la tuile d'une liste (24/11) : le nombre de variantes, le stock vendable, les brouillons. Le mot du stock
// suit l'état : un neuf a des exemplaires « en stock », une occasion est une pièce unique, des « appareils ».
export function groupStatus(group: VariantGroup, kind: "new" | "used"): string {
  const count = group.variants.length;
  if (count === 0) return "Aucune variante";
  const stock = kind === "new" ? `${group.stock} en stock` : `${group.stock} appareil${group.stock > 1 ? "s" : ""}`;
  const drafts = group.drafts > 0 ? ` · ${group.drafts} brouillon${group.drafts > 1 ? "s" : ""}` : "";
  return `${count} variante${count > 1 ? "s" : ""} · ${stock}${drafts}`;
}

// Le point de couleur de la tuile : à compléter dès qu'une variante a un manque (prix, boîte, garantie, origine des
// pièces), rempli sinon, facultatif tant qu'il n'y a aucune variante.
export function groupState(group: VariantGroup): "done" | "todo" | "optional" {
  if (group.variants.length === 0) return "optional";
  return group.variants.some((variant) => variantProblems(variant).length > 0) ? "todo" : "done";
}
