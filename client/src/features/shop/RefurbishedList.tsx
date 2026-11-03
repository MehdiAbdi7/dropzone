"use client";

import { useState } from "react";
import type { ProductKind, Variant } from "@/types/api";
import RefurbishedCard from "./RefurbishedCard";

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
// du moins cher au plus cher par défaut.
export default function RefurbishedList({ variants, kind }: { variants: Variant[]; kind: ProductKind }) {
  const [sort, setSort] = useState<RefurbSort>("price");
  const sorted = [...variants].sort(SORTS[sort].compare);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          {variants.length} appareil{variants.length > 1 ? "s" : ""} disponible{variants.length > 1 ? "s" : ""}. Chacun est
          unique : en bleu ce qui a été changé, en rouge les défauts.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-ink-muted">Trier</span>
          <select className="input min-h-9 w-auto py-1" value={sort} onChange={(event) => setSort(event.target.value as RefurbSort)}>
            {Object.entries(SORTS).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ul className="space-y-4">
        {sorted.map((variant) => (
          <li key={variant.sku}>
            <RefurbishedCard variant={variant} kind={kind} />
          </li>
        ))}
      </ul>
    </div>
  );
}
