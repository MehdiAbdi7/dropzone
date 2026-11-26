"use client";

import { useEffect, useState } from "react";
import type { Palette } from "@/config/colors";
import type { ProductKind, Variant } from "@/types/api";
import RefurbishedCard from "./RefurbishedCard";
import { mediaSummary, pinFirst } from "./variantMediaRules";

type RefurbSort = "price" | "grade" | "battery";

const SORTS: Record<RefurbSort, { label: string; compare: (a: Variant, b: Variant) => number }> = {
  price: { label: "Prix croissant", compare: (a, b) => a.price - b.price },
  grade: { label: "Meilleur état", compare: (a, b) => (b.grade ?? 0) - (a.grade ?? 0) || a.price - b.price },
  battery: {
    label: "Meilleure batterie",
    compare: (a, b) => (b.batteryHealth ?? 0) - (a.batteryHealth ?? 0) || a.price - b.price,
  },
};

// Tous les reconditionnés en stock d'un modèle, une radiographie par appareil,
// du moins cher au plus cher par défaut. La palette donne la pastille de chaque couleur.
// Plusieurs appareils peuvent avoir la même couleur (26/11) : un clic sur un appareil le choisit, et ce sont SES photos
// et SA vidéo qui apparaissent sous le téléphone (aucune s'il n'en a pas : celles de l'appareil d'avant ne restent
// pas). `selectedSku` : l'appareil choisi.
export default function RefurbishedList({
  variants,
  kind,
  palette,
  selectedSku = null,
  onSelect,
}: {
  variants: Variant[];
  kind: ProductKind;
  palette: Palette;
  selectedSku?: string | null;
  onSelect?: (variant: Variant) => void;
}) {
  const [sort, setSort] = useState<RefurbSort>("price");
  // Venu d'une story : l'appareil visé passe en tête de la liste (sous le téléphone sur mobile, il est visible sans
  // défiler). Le choix d'un tri par le client remet la liste dans l'ordre normal.
  const [pinned, setPinned] = useState<string | null>(selectedSku);
  const sorted = pinFirst([...variants].sort(SORTS[sort].compare), pinned);
  // Une fiche peut couvrir plusieurs exemplaires identiques : on compte les appareils, pas les fiches.
  const units = variants.reduce((sum, variant) => sum + variant.stock, 0);

  // Un seul appareil : rien à deviner, ses photos et sa vidéo s'affichent tout de suite.
  useEffect(() => {
    if (onSelect && variants.length === 1 && selectedSku !== variants[0].sku) {
      onSelect(variants[0]);
    }
    // Au premier affichage seulement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          {units} appareil{units > 1 ? "s" : ""} disponible{units > 1 ? "s" : ""}. Chaque fiche décrit l&apos;état réel de
          ses appareils : en bleu ce qui a été changé, en rouge les défauts.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-ink-muted">Trier</span>
          <select className="input min-h-9 w-auto py-1" value={sort} onChange={(event) => {
              setSort(event.target.value as RefurbSort);
              setPinned(null);
            }}>
            {Object.entries(SORTS).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {onSelect && variants.length > 1 && variants.some((variant) => (variant.media?.length ?? 0) > 0) ? (
        <p className="rounded-lg border border-line bg-surface-2 p-3 text-sm">
          Plusieurs appareils sont disponibles : appuie sur <strong>« Voir cet appareil sous le téléphone »</strong> pour afficher ses
          photos et sa vidéo.
        </p>
      ) : null}
      <ul className="space-y-4">
        {sorted.map((variant) => {
          const hasMedia = (variant.media?.length ?? 0) > 0;
          const selected = variant.sku === selectedSku;
          return (
            <li
              key={variant.sku}
              id={`unit-${variant.sku}`}
              className={`rounded-2xl transition-shadow ${selected ? "ring-2 ring-blue-ink" : ""}`}
              // Un clic sur l'appareil le choisit, sauf sur ses boutons et liens (ajouter au panier…).
              onClick={(event) => {
                if (onSelect && !(event.target as HTMLElement).closest("button, a, select, input")) {
                  onSelect(variant);
                }
              }}
            >
              {onSelect ? (
                // L'en-tête de chaque appareil (27/11, remarque de Mehdi : « c'est dur de deviner qu'il faut cliquer sur toute
                // la carte ») : un vrai bouton, toujours visible, qui dit ce qu'il y a à voir et ce que fait le clic.
                <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <button type="button" className={`btn btn-small ${selected ? "btn-primary" : "btn-secondary"}`} aria-pressed={selected} onClick={() => onSelect(variant)}>
                    {selected ? "✓ Affiché sous le téléphone" : hasMedia ? "Voir cet appareil sous le téléphone" : "Choisir cet appareil"}
                  </button>
                  <span className="text-sm text-ink-muted">
                    {hasMedia ? `Photos et vidéo : ${mediaSummary(variant.media)}` : "Pas de photo ni de vidéo pour cet appareil"}
                  </span>
                </div>
              ) : null}
              <RefurbishedCard variant={variant} kind={kind} palette={palette} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
