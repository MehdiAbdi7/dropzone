import { OPTION_ORDER_BY_KIND } from "@/config/catalog";
import type { ProductKind, Variant } from "@/types/api";

// Les calculs du choix d'un neuf, sans React : ce qui reste dans chaque option.
// Exemple de Mehdi : 3 Bordeaux (2 en 256 Go, 1 en 512 Go), 1 Noir, 1 Argent.

type Selection = Record<string, string>;

// Les clés d'options présentes dans les variantes, dans l'ordre de la sorte de produit ;
// une clé inconnue de cet ordre passe après, par ordre alphabétique. `exclude` : une clé déjà
// choisie avant (la couleur, à l'étape Couleur), que la page ne redemande pas.
export function optionKeys(variants: Variant[], kind: ProductKind, exclude?: string): string[] {
  const order = OPTION_ORDER_BY_KIND[kind];
  const rank = (key: string) => (order.includes(key) ? order.indexOf(key) : order.length);
  const keys = [...new Set(variants.flatMap((variant) => Object.keys(variant.options)))].filter((key) => key !== exclude);
  return keys.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, "fr"));
}

// Une variante a-t-elle les valeurs choisies pour les clés données ?
const matches = (variant: Variant, selected: Selection, keys: string[]) =>
  keys.every((key) => variant.options[key] === selected[key]);

// Pour chaque clé, toutes ses valeurs (la liste ne change pas d'un choix à l'autre) et,
// pour chacune, le stock des variantes qui ont aussi les valeurs choisies des clés d'avant :
// le stockage se compte dans la couleur choisie, la RAM dans la couleur et le stockage.
export function optionChoices(
  variants: Variant[],
  keys: string[],
  selected: Selection,
): { key: string; values: { value: string; stock: number }[] }[] {
  return keys.map((key, index) => {
    const before = keys.slice(0, index);
    const values = [...new Set(variants.map((variant) => variant.options[key]).filter(Boolean))];
    return {
      key,
      values: values.map((value) => ({
        value,
        stock: variants
          .filter((variant) => variant.options[key] === value && matches(variant, selected, before))
          .reduce((sum, variant) => sum + variant.stock, 0),
      })),
    };
  });
}

// Le choix de départ : la variante en stock la moins chère, sinon la première.
export function initialSelection(variants: Variant[], keys: string[]): Selection {
  const inStock = variants.filter((variant) => variant.stock > 0).sort((a, b) => a.price - b.price);
  const start = inStock[0] ?? variants[0];
  return start ? Object.fromEntries(keys.map((key) => [key, start.options[key]])) : {};
}

// Le client choisit une valeur : les clés suivantes gardent leur valeur si elle est encore
// en stock avec ce choix, sinon passent à la première valeur en stock (sinon la première).
export function selectOption(
  variants: Variant[],
  keys: string[],
  selected: Selection,
  key: string,
  value: string,
): Selection {
  const next: Selection = { ...selected, [key]: value };
  for (const later of keys.slice(keys.indexOf(key) + 1)) {
    const { values } = optionChoices(variants, keys, next)[keys.indexOf(later)];
    const current = values.find((item) => item.value === next[later]);
    if (!current || current.stock === 0) {
      next[later] = (values.find((item) => item.stock > 0) ?? values[0])?.value;
    }
  }
  return next;
}

// Les chiffres des deux cartes « Neuf » et « Reconditionné » (mêmes règles que l'API).
export function conditionSummary(variants: Variant[]): {
  newFrom: number | null;
  newStock: number;
  refurbishedFrom: number | null;
  refurbishedCount: number;
} {
  const lowest = (list: Variant[]) => {
    const inStock = list.filter((variant) => variant.stock > 0);
    return inStock.length > 0 ? Math.min(...inStock.map((variant) => variant.price)) : null;
  };
  const fresh = variants.filter((variant) => variant.condition === "new");
  const refurbished = variants.filter((variant) => variant.condition === "refurbished");
  return {
    newFrom: lowest(fresh),
    newStock: fresh.reduce((sum, variant) => sum + variant.stock, 0),
    refurbishedFrom: lowest(refurbished),
    refurbishedCount: refurbished.filter((variant) => variant.stock > 0).length,
  };
}
