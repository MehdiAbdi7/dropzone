import type { ProductDetail, SeriesPoster } from "@/types/api";
import { type JourneyCondition, type JourneyStepKey, journeySteps, productJourney, seriesJourney } from "./journey";
import JourneyBar from "./JourneyBar";
import { colorChoices, conditionChoices } from "./journeyChoices";

// Le parcours d'achat d'un produit : un Server Component qui prépare les étapes et les listes que la
// page connaît déjà (l'état et la couleur se lisent sur le produit), puis laisse JourneyBar charger
// les autres à la première ouverture. `current` est l'étape de la page ; « end » sur la fiche finale.
export function ProductJourney({
  product,
  current,
  condition,
  color,
}: {
  product: ProductDetail;
  current: JourneyStepKey | "end";
  condition: JourneyCondition | null;
  color: string | null;
}) {
  const steps = journeySteps(productJourney(product, current, condition, color));
  return (
    <JourneyBar
      steps={steps}
      current={current}
      context={{
        category: product.category.slug,
        brand: product.brand?.slug ?? null,
        series: product.series?.slug ?? null,
        product: product.slug,
      }}
      staticChoices={{
        condition: conditionChoices(product, condition),
        ...(condition ? { color: colorChoices(product, condition, color) } : {}),
      }}
    />
  );
}

// Le parcours de la page d'une série : on y choisit le modèle.
export function SeriesJourney({ poster }: { poster: SeriesPoster }) {
  return (
    <JourneyBar
      steps={journeySteps(seriesJourney(poster))}
      current="model"
      context={{ category: poster.category.slug, brand: poster.brand.slug, series: poster.slug, product: null }}
      staticChoices={{}}
    />
  );
}
