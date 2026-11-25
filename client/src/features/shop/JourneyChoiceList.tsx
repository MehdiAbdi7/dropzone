"use client";

import Link from "next/link";
import { type RefObject, useEffect } from "react";
import { CheckIcon } from "@/components/ui/icons";
import type { JourneyStep, JourneyStepKey } from "./journey";
import {
  type JourneyChoice,
  brandChoices,
  categoryChoices,
  modelChoices,
  seriesChoices,
} from "./journeyChoices";
import { useLazyJourneyBrandsQuery, useLazyJourneyCategoriesQuery, useLazyJourneyModelsQuery } from "./journeyApi";

// Ce que la liste d'une étape a besoin de savoir de la page : les slugs pour interroger l'API.
export type JourneyContext = {
  category: string;
  brand: string | null;
  series: string | null;
  product: string | null;
};

// L'état et la couleur se lisent sur le produit déjà chargé par la page : la page les passe.
export type StaticChoices = Partial<Record<"condition" | "color", JourneyChoice[]>>;

const ALL_LABELS: Record<JourneyStepKey, string> = {
  category: "Voir toutes les catégories",
  brand: "Voir toutes les marques",
  series: "Voir toutes les séries",
  model: "Voir tous les modèles",
  condition: "Voir Neuf scellé et Occasion",
  color: "Voir toutes les couleurs",
};

// Les choix d'une étape. État et couleur : déjà là. Les autres se chargent à la première ouverture
// (cette liste n'est montée qu'à ce moment), et RTK Query garde la réponse pour les ouvertures
// suivantes. Les marques et les séries viennent du même appel.
function useStepChoices(step: JourneyStep, context: JourneyContext, staticChoices: StaticChoices) {
  const [loadCategories, categories] = useLazyJourneyCategoriesQuery();
  const [loadBrands, brands] = useLazyJourneyBrandsQuery();
  const [loadModels, models] = useLazyJourneyModelsQuery();
  const { category, brand, series } = context;

  useEffect(() => {
    if (step.key === "category") {
      loadCategories(undefined, true);
    } else if (step.key === "brand" || step.key === "series") {
      loadBrands(category, true);
    } else if (step.key === "model" && brand && series) {
      loadModels({ category, brand, series }, true);
    }
  }, [step.key, category, brand, series, loadCategories, loadBrands, loadModels]);

  switch (step.key) {
    case "condition":
    case "color":
      return { choices: staticChoices[step.key] ?? [], status: "ready" as const };
    case "category":
      return {
        choices: categories.data ? categoryChoices(categories.data, category) : [],
        status: categories.isError ? ("error" as const) : categories.data ? ("ready" as const) : ("loading" as const),
      };
    case "brand":
      return {
        choices: brands.data ? brandChoices(brands.data, category, brand) : [],
        status: brands.isError ? ("error" as const) : brands.data ? ("ready" as const) : ("loading" as const),
      };
    case "series":
      return {
        choices: brands.data && brand ? seriesChoices(brands.data, category, brand, series) : [],
        status: brands.isError ? ("error" as const) : brands.data ? ("ready" as const) : ("loading" as const),
      };
    case "model":
      return {
        choices: models.data ? modelChoices(models.data, context.product) : [],
        status: models.isError ? ("error" as const) : models.data || !(brand && series) ? ("ready" as const) : ("loading" as const),
      };
  }
}

// Les lignes qui s'ouvrent sous une étape faite : les autres choix possibles, chacun un vrai lien
// (le Ctrl+clic marche), puis « Voir toutes … » vers la page de l'étape. Si la liste ne se charge
// pas, ce dernier lien reste utilisable.
export default function JourneyChoiceList({
  step,
  context,
  staticChoices,
  listRef,
  onNavigate,
}: {
  step: JourneyStep;
  context: JourneyContext;
  staticChoices: StaticChoices;
  listRef?: RefObject<HTMLDivElement | null>;
  onNavigate: () => void;
}) {
  const { choices, status } = useStepChoices(step, context, staticChoices);
  return (
    <div ref={listRef} role="list" aria-label={`Changer de ${step.label.toLowerCase()}`} className="filter-list">
      {status === "loading" ? <p className="journey-note">Chargement…</p> : null}
      {status === "error" ? <p className="journey-note">Impossible de charger la liste.</p> : null}
      {choices.map((choice) => (
        <Link
          key={choice.href}
          href={choice.href}
          role="listitem"
          aria-current={choice.selected ? "true" : undefined}
          data-current={choice.selected ? "" : undefined}
          onClick={onNavigate}
          className="filter-option"
        >
          <span className="filter-check">{choice.selected ? <CheckIcon size={16} /> : null}</span>
          <span className="min-w-0 flex-1 truncate">{choice.label}</span>
          <span className="filter-detail">{choice.detail}</span>
        </Link>
      ))}
      {step.href ? (
        <Link href={step.href} role="listitem" onClick={onNavigate} className="journey-all">
          ← {ALL_LABELS[step.key]}
        </Link>
      ) : null}
    </div>
  );
}
