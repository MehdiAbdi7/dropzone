// Les lignes de la liste qui s'ouvre sous une étape du parcours (25/11), sans React : les autres
// choix possibles à cette étape, chacun avec le lien de la page où il mène. La logique de l'étape
// elle-même est dans journey.ts.
import { CONDITION_LABELS } from "@/config/catalog";
import type { BrandSeries, Category, ProductDetail, SeriesPoster } from "@/types/api";
import { colorHref, ofColor } from "./colors";
import type { JourneyCondition } from "./journey";

export type JourneyChoice = {
  label: string;
  // Le petit texte gris à droite de la ligne (« 3 séries »), vide s'il n'y a rien à dire.
  detail: string;
  href: string;
  selected: boolean;
};

const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? "s" : ""}`;

export function categoryChoices(categories: Category[], current: string): JourneyChoice[] {
  return categories.map((one) => ({
    label: one.name,
    detail: "",
    href: `/boutique/${one.slug}`,
    selected: one.slug === current,
  }));
}

// Les marques d'une catégorie d'appareils, avec leur nombre de séries. `current` est null pour un
// produit rangé dans « Autres » : aucune ligne n'est cochée.
export function brandChoices(groups: BrandSeries[], category: string, current: string | null): JourneyChoice[] {
  return groups.map((group) => ({
    label: group.brand.name,
    detail: plural(group.series.length, "série"),
    href: `/boutique/${category}/${group.brand.slug}`,
    selected: group.brand.slug === current,
  }));
}

// Les séries d'une marque, avec leur nombre de modèles ; vide si la marque n'est pas dans la liste.
export function seriesChoices(
  groups: BrandSeries[],
  category: string,
  brand: string,
  current: string | null,
): JourneyChoice[] {
  const group = groups.find((one) => one.brand.slug === brand);
  return (group?.series ?? []).map((one) => ({
    label: one.name,
    detail: plural(one.models.length, "modèle"),
    href: `/boutique/${category}/${brand}/${one.slug}`,
    selected: one.slug === current,
  }));
}

// Les modèles d'une série qui ont une fiche : un modèle pas encore en vente n'a pas de page où mener.
export function modelChoices(poster: SeriesPoster, current: string | null): JourneyChoice[] {
  return poster.models.flatMap((model) =>
    model.productSlug
      ? [
          {
            label: model.name,
            detail: model.colors.length > 0 ? `${model.colors.length} coloris` : "",
            href: `/produits/${model.productSlug}`,
            selected: model.productSlug === current,
          },
        ]
      : [],
  );
}

const CONDITIONS: JourneyCondition[] = ["new", "refurbished"];

// Neuf scellé puis Occasion, seulement ceux qui ont au moins un exemplaire en stock.
export function conditionChoices(product: ProductDetail, current: JourneyCondition | null): JourneyChoice[] {
  return CONDITIONS.filter((condition) =>
    product.variants.some((variant) => variant.condition === condition && variant.stock > 0),
  ).map((condition) => ({
    label: CONDITION_LABELS[condition],
    detail: "",
    href: `/produits/${product.slug}/${condition === "new" ? "neuf" : "occasion"}`,
    selected: condition === current,
  }));
}

// Les couleurs du modèle qui ont du stock dans l'état choisi (une couleur sans stock est barrée sur
// l'étape Couleur : elle n'a pas sa place ici).
export function colorChoices(product: ProductDetail, condition: JourneyCondition, current: string | null): JourneyChoice[] {
  const ofCondition = product.variants.filter((variant) => variant.condition === condition);
  return product.colors
    .filter((color) => ofColor(ofCondition, color.name).some((variant) => variant.stock > 0))
    .map((color) => ({
      label: color.name,
      detail: "",
      href: colorHref(product.slug, color.name, condition === "new" ? "neuf" : "occasion"),
      selected: color.name === current,
    }));
}
