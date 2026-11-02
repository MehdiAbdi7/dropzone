"use client";

import { useState } from "react";
import Field from "@/components/ui/Field";
import { KIND_LABELS } from "@/config/catalog";
import { useModelsQuery } from "../adminApi";

// Pour un accessoire (coque, verre trempé) : les modèles avec lesquels il est
// compatible, à cocher. Une coque peut aller sur plusieurs modèles de même taille.
export default function CompatibleModelsPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (ids: number[]) => void;
}) {
  const { data: models = [] } = useModelsQuery();
  const [search, setSearch] = useState("");
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = words.length
    ? models.filter((model) => words.every((word) => `${model.brand} ${model.name}`.toLowerCase().includes(word)))
    : [];
  const selected = models.filter((model) => value.includes(model.id));

  const toggle = (id: number) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" aria-label="Modèles compatibles cochés">
        {selected.length === 0 ? <p className="text-sm text-ink-muted">Aucun modèle coché.</p> : null}
        {selected.map((model) => (
          <button key={model.id} type="button" className="chip" aria-pressed onClick={() => toggle(model.id)}>
            {model.brand} {model.name} <span aria-hidden="true">×</span>
            <span className="sr-only">(retirer)</span>
          </button>
        ))}
      </div>
      <Field id="compatible-search" label="Ajouter un modèle compatible" hint="Tapez quelques lettres : 15 pro, s24…">
        <input
          id="compatible-search"
          className="input"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </Field>
      {matches.length > 0 ? (
        <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-line p-2 text-sm">
          {matches.slice(0, 30).map((model) => (
            <li key={model.id}>
              <label className="flex items-center gap-2 py-1">
                <input type="checkbox" checked={value.includes(model.id)} onChange={() => toggle(model.id)} className="size-4" />
                {model.brand} {model.name} <span className="text-ink-muted">({KIND_LABELS[model.kind]})</span>
              </label>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
