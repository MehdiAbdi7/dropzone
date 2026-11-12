// Les choix de la fenêtre d'un accessoire (refonte du 12/11), sans React : quelle variante
// correspond aux options choisies, quelles valeurs restent possibles, et pour un verre, quelle
// taille va sur le téléphone du client (les téléphones compatibles de chaque variante).
import type { Options, Variant } from "@/types/api";

const SIZE = "Taille de l'écran";

// La variante dont toutes les options sont celles choisies ; undefined tant qu'il en manque une.
// Une variante épuisée est rendue aussi : la fenêtre affiche alors « Rupture de stock ».
export function findVariant(variants: Variant[], chosen: Options): Variant | undefined {
  return variants.find((variant) => Object.entries(variant.options).every(([key, value]) => chosen[key] === value));
}

// Une valeur est possible si une variante l'a, avec les autres choix déjà faits (le pack Anker
// n'existe pas en Lightning 65 W : la pastille est barrée). Le stock n'y est pour rien.
export function isPossible(variants: Variant[], key: string, value: string, chosen: Options): boolean {
  return variants.some(
    (variant) =>
      variant.options[key] === value &&
      Object.entries(chosen).every(([other, picked]) => other === key || variant.options[other] === undefined || variant.options[other] === picked),
  );
}

// Les téléphones d'un verre, chacun une fois avec sa taille (la première variante qui le
// contient, si le gérant l'a coché dans deux tailles), du plus récent au plus ancien par le nom.
export function phonesOf(variants: Variant[]): { name: string; slug: string; size: string }[] {
  const phones = new Map<string, { name: string; slug: string; size: string }>();
  for (const variant of variants) {
    const size = variant.options[SIZE];
    for (const model of variant.compatibleModels ?? []) {
      if (size && !phones.has(model.slug)) {
        phones.set(model.slug, { name: model.name, slug: model.slug, size });
      }
    }
  }
  return [...phones.values()].sort((a, b) => b.name.localeCompare(a.name, "fr", { numeric: true }));
}

export function sizeForPhone(variants: Variant[], slug: string): string | null {
  return phonesOf(variants).find((phone) => phone.slug === slug)?.size ?? null;
}
