"use client";

import { KIND_LABELS } from "@/config/catalog";
import type { ProductKind } from "@/types/api";

const KINDS = Object.keys(KIND_LABELS) as ProductKind[];

// Les catégories (smartphone, PC, tablette…) dans lesquelles une liste d'options est proposée.
export default function KindPicker({
  value,
  onChange,
  label,
}: {
  value: ProductKind[];
  onChange: (value: ProductKind[]) => void;
  label: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            className="chip"
            aria-pressed={value.includes(kind)}
            onClick={() => onChange(value.includes(kind) ? value.filter((item) => item !== kind) : [...value, kind])}
          >
            {KIND_LABELS[kind]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
