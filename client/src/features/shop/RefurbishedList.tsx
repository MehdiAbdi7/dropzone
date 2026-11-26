"use client";

import { useEffect, useMemo, useState } from "react";
import type { Palette } from "@/config/colors";
import type { ProductKind, Variant } from "@/types/api";
import RefurbishedCard from "./RefurbishedCard";
import { unitLabel } from "./refurbishedUnits";
import { mediaSummary } from "./variantMediaRules";

// Les reconditionnés en stock d'un modèle (dans la couleur choisie) : une LISTE DÉROULANTE pour choisir l'appareil, et la fiche
// (la radiographie de l'appareil : état, pièces changées, défauts, batterie) de celui qui est choisi, rien d'autre (27/11,
// remarque de Mehdi : avant, toutes les cartes s'empilaient et il fallait deviner qu'il fallait en cliquer une pour voir ses
// photos). Le moins cher est choisi au départ, ou celui d'un lien de story (`initialSku`). `onCurrent` est prévenu de l'appareil
// choisi, au départ puis à chaque choix : la visionneuse montre ses photos et sa vidéo sous le téléphone. Un seul appareil :
// pas de liste, il est déjà choisi. La palette donne la pastille de chaque couleur.
export default function RefurbishedList({
  variants,
  kind,
  palette,
  initialSku,
  onCurrent,
}: {
  variants: Variant[];
  kind: ProductKind;
  palette: Palette;
  initialSku?: string;
  onCurrent?: (variant: Variant) => void;
}) {
  const sorted = useMemo(() => [...variants].sort((a, b) => a.price - b.price), [variants]);
  const [sku, setSku] = useState(() => sorted.find((variant) => variant.sku === initialSku)?.sku ?? sorted[0]?.sku ?? "");
  const current = sorted.find((variant) => variant.sku === sku) ?? sorted[0];
  // Dépend du SKU seulement : la fonction reçue change à chaque rendu du parent, la relancer bouclerait.
  useEffect(() => {
    if (current) onCurrent?.(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.sku]);

  if (!current) {
    return null;
  }
  // Une fiche peut couvrir plusieurs exemplaires identiques : on compte les appareils, pas les fiches.
  const units = variants.reduce((total, variant) => total + variant.stock, 0);
  const summary = mediaSummary(current.media);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        {units} appareil{units > 1 ? "s" : ""} disponible{units > 1 ? "s" : ""}. La fiche décrit l&apos;état réel de l&apos;appareil : en
        bleu ce qui a été changé, en rouge les défauts.
      </p>
      {sorted.length > 1 ? (
        <label className="block space-y-1">
          <span className="label">Choisis l&apos;appareil ({sorted.length} disponibles)</span>
          <select className="input" value={current.sku} onChange={(event) => setSku(event.target.value)}>
            {sorted.map((variant) => (
              <option key={variant.sku} value={variant.sku}>
                {unitLabel(variant)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {onCurrent ? (
        <p className="text-sm text-ink-muted">
          {summary ? `Photos et vidéo de cet appareil, sous le téléphone : ${summary}.` : "Pas de photo ni de vidéo pour cet appareil."}
        </p>
      ) : null}
      {/* `key` : changer d'appareil repart d'une fiche neuve (quantité, défilement). */}
      <RefurbishedCard key={current.sku} variant={current} kind={kind} palette={palette} />
    </div>
  );
}
