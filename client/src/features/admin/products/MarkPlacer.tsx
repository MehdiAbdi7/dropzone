"use client";

import { useState } from "react";
import DeviceDiagram from "@/features/shop/DeviceDiagram";
import { diagramKindOf } from "@/features/shop/diagramShapes";
import { hasZone, zonesOf } from "@/features/shop/diagramZones";
import type { DiagramMarks, DiagramPoint, ProductKind } from "@/types/api";
import { type VariantDraft, withMark } from "./productDraft";

type Item = { group: keyof DiagramMarks; label: string };

const itemKey = (item: Item) => `${item.group}:${item.label}`;

// Placer sur le dessin les pièces et les défauts ajoutés à la main (27/11, demande de Mehdi). Une valeur de la liste
// (« Écran », « Pixel mort ») a sa zone connue sur le dessin de la boutique ; une valeur tapée à la main n'en a aucune et
// n'était donc pas dessinée. Ici le gérant choisit la valeur, puis clique sur le dessin à l'endroit voulu : un défaut devient
// un point rouge à cet endroit, une pièce colore en bleu la zone sous le clic (l'écran entier s'il clique sur l'écran, que ce
// soit l'afficheur ou le verre), ou devient un point bleu s'il clique hors de toute zone. Rien ne s'affiche quand toutes les
// valeurs de la fiche sont dans les listes.
export default function MarkPlacer({
  variant,
  kind,
  onChange,
}: {
  variant: VariantDraft;
  kind: ProductKind;
  onChange: (variant: VariantDraft) => void;
}) {
  const [chosen, setChosen] = useState<string | null>(null);

  const items: Item[] = [
    ...variant.replacedParts.filter((label) => !hasZone(label, kind)).map((label) => ({ group: "parts" as const, label })),
    ...variant.defects.filter((label) => !hasZone(label, kind)).map((label) => ({ group: "defects" as const, label })),
  ];
  if (items.length === 0) {
    return null;
  }

  const placed = (item: Item) => Boolean(variant.diagramMarks[item.group][item.label]);
  // La valeur en cours : celle que le gérant a touchée, sinon la première pas encore placée, sinon la première.
  const current = items.find((item) => itemKey(item) === chosen) ?? items.find((item) => !placed(item)) ?? items[0];
  const zones = zonesOf(variant, kind);

  function place(point: DiagramPoint) {
    onChange(withMark(variant, current.group, current.label, point));
    // La suivante à placer est proposée tout de suite ; si tout est placé, la valeur reste choisie (pour la déplacer).
    const next = items.find((item) => itemKey(item) !== itemKey(current) && !placed(item));
    setChosen(next ? itemKey(next) : itemKey(current));
  }

  return (
    <div className="space-y-3 rounded-lg border border-line bg-surface p-4">
      <p className="label">Placer sur le dessin ce qui n&apos;est pas dans les listes</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Valeur à placer">
        {items.map((item) => (
          <button
            key={itemKey(item)}
            type="button"
            className="chip"
            aria-pressed={itemKey(item) === itemKey(current)}
            onClick={() => setChosen(itemKey(item))}
          >
            <span aria-hidden="true" className={`mr-1.5 inline-block size-2.5 rounded-full ring-1 ring-white/70 ${item.group === "parts" ? "bg-blue" : "bg-red"}`} />
            {item.label}
            {placed(item) ? <span className="text-ink-muted"> (placé)</span> : <span className="font-bold text-red"> (à placer)</span>}
          </button>
        ))}
      </div>
      <DeviceDiagram
        kind={diagramKindOf(kind)}
        replaced={zones.replaced}
        defects={zones.defects}
        replacedDots={zones.replacedDots}
        defectDots={zones.defectDots}
        onPick={place}
        activeDot={variant.diagramMarks[current.group][current.label]}
      />
      <p className="text-xs text-ink-muted">
        {current.group === "parts"
          ? `Clique sur le dessin pour « ${current.label} » : la zone touchée devient bleue (l'écran entier si tu cliques sur l'écran, afficheur ou verre).`
          : `Clique sur le dessin à l'endroit du défaut « ${current.label} » : un point rouge s'y pose. Clique ailleurs pour le déplacer.`}
      </p>
    </div>
  );
}
