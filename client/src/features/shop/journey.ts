// Le parcours d'achat des pages d'un appareil (25/11, demande de Mehdi), sans React : les six
// étapes (Catégorie, Marque, Série, Modèle, État, Couleur), laquelle est en cours, où mène le bouton
// retour et les textes. Séparé du composant pour être testé seul.
import { CONDITION_LABELS } from "@/config/catalog";
import type { ProductDetail, SeriesPoster } from "@/types/api";

export type JourneyStepKey = "category" | "brand" | "series" | "model" | "condition" | "color";

export type JourneyStep = {
  key: JourneyStepKey;
  label: string;
  // Le choix fait ; « À choisir » pour l'étape en cours ; null pour une étape à venir.
  value: string | null;
  // La page où ce choix se fait (pas la page courante) : l'étape « Série » mène à la page de la
  // marque, où les séries se choisissent. null quand elle ne peut pas encore se calculer.
  href: string | null;
  status: "done" | "current" | "todo";
};

export type JourneyCondition = "new" | "refurbished";

export type JourneyInput = {
  category: { name: string; slug: string };
  // null = le produit est rangé dans « Autres ».
  brand: { name: string; slug: string } | null;
  // null = pas de série : l'étape est retirée.
  series: { name: string; slug: string } | null;
  // Le slug est celui du produit (`/produits/<slug>`).
  model: { name: string; slug: string } | null;
  // Un modèle sans couleurs n'a pas d'étape Couleur.
  hasColors: boolean;
  condition: JourneyCondition | null;
  color: string | null;
  // L'étape de la page affichée ; « end » sur la fiche finale, où tout est choisi.
  current: JourneyStepKey | "end";
};

const LABELS: Record<JourneyStepKey, string> = {
  category: "Catégorie",
  brand: "Marque",
  series: "Série",
  model: "Modèle",
  condition: "État",
  color: "Couleur",
};

const TITLES: Record<JourneyStepKey | "end", string> = {
  category: "Choisis ta catégorie",
  brand: "Choisis ta marque",
  series: "Choisis ta série",
  model: "Choisis ton modèle",
  condition: "Neuf scellé ou occasion ?",
  color: "Choisis la couleur",
  end: "Prêt à commander",
};

const ORDER: JourneyStepKey[] = ["category", "brand", "series", "model", "condition", "color"];

export function journeyTitle(current: JourneyStepKey | "end"): string {
  return TITLES[current];
}

// Les étapes d'un produit, dans l'ordre, sans celles qui n'existent pas pour lui.
export function journeySteps(input: JourneyInput): JourneyStep[] {
  const keys = ORDER.filter((key) => (key !== "series" || input.series) && (key !== "color" || input.hasColors));
  // Sur la fiche finale, l'indice dépasse la dernière étape : aucune n'est en cours, toutes sont faites.
  const currentIndex = input.current === "end" ? keys.length : keys.indexOf(input.current);
  const brandSlug = input.brand?.slug ?? "autres";
  const categoryPage = `/boutique/${input.category.slug}`;
  const brandPage = `${categoryPage}/${brandSlug}`;

  const values: Record<JourneyStepKey, string | null> = {
    category: input.category.name,
    brand: input.brand?.name ?? "Autres",
    series: input.series?.name ?? null,
    model: input.model?.name ?? null,
    condition: input.condition ? CONDITION_LABELS[input.condition] : null,
    color: input.color,
  };
  const hrefs: Record<JourneyStepKey, string | null> = {
    category: "/boutique",
    brand: categoryPage,
    series: brandPage,
    // Le modèle se choisit sur l'affiche de la série ; sans série, sur la page de la marque.
    model: input.series && input.brand ? `${brandPage}/${input.series.slug}` : brandPage,
    condition: input.model ? `/produits/${input.model.slug}` : null,
    color:
      input.model && input.condition
        ? `/produits/${input.model.slug}/${input.condition === "new" ? "neuf" : "occasion"}`
        : null,
  };

  return keys.map((key, index) => {
    const status = index < currentIndex ? "done" : index === currentIndex ? "current" : "todo";
    return {
      key,
      label: LABELS[key],
      value: status === "done" ? values[key] : status === "current" ? "À choisir" : null,
      href: hrefs[key],
      status,
    };
  });
}

export function journeyProgress(steps: JourneyStep[]): { position: number | null; total: number; kicker: string } {
  const index = steps.findIndex((step) => step.status === "current");
  if (index === -1) {
    return { position: null, total: steps.length, kicker: "TOUT EST CHOISI" };
  }
  return { position: index + 1, total: steps.length, kicker: `ÉTAPE ${index + 1} SUR ${steps.length}` };
}

// Le bouton retour : la page de l'étape d'avant celle de la page courante ; sur la fiche finale
// (aucune étape en cours), la page de la dernière étape. Rien sur la première étape.
export function journeyBackHref(steps: JourneyStep[]): string | null {
  const index = steps.findIndex((step) => step.status === "current");
  if (index === -1) {
    return steps.at(-1)?.href ?? null;
  }
  return index > 0 ? steps[index - 1].href : null;
}

// Le parcours d'un produit : la page du choix de l'état, de la couleur ou la fiche finale.
export function productJourney(
  product: ProductDetail,
  current: JourneyStepKey | "end",
  condition: JourneyCondition | null,
  color: string | null,
): JourneyInput {
  return {
    category: { name: product.category.name, slug: product.category.slug },
    brand: product.brand,
    series: product.series,
    model: { name: product.name, slug: product.slug },
    hasColors: product.colors.length > 0,
    condition,
    color,
    current,
  };
}

// Le parcours de la page d'une série : on y choisit le modèle. On ne sait pas encore lequel, donc
// on ne sait pas s'il a des couleurs : l'étape Couleur est montrée, à venir.
export function seriesJourney(poster: SeriesPoster): JourneyInput {
  return {
    category: poster.category,
    brand: poster.brand,
    series: { name: poster.name, slug: poster.slug },
    model: null,
    hasColors: true,
    condition: null,
    color: null,
    current: "model",
  };
}
