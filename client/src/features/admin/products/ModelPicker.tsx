"use client";

import { useState } from "react";
import Field from "@/components/ui/Field";
import { errorMessage } from "@/lib/errors";
import type { ProductKind } from "@/types/api";
import { useCreateModelMutation, useModelsQuery, type DeviceModel } from "@/features/admin/api/catalogApi";

const MAX_SHOWN = 12;

// Le choix du modèle d'appareil : une recherche dans la liste complète (iPhone,
// Galaxy, Pixel, MacBook…), filtrée par la sorte de la catégorie, et un ajout
// sur place si le modèle n'existe pas encore.
export default function ModelPicker({
  kind,
  value,
  onChange,
}: {
  kind: ProductKind;
  value: number | null;
  onChange: (model: DeviceModel) => void;
}) {
  const { data: models = [] } = useModelsQuery();
  const [createModel, { isLoading, error }] = useCreateModelMutation();
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [brand, setBrand] = useState("");
  const [name, setName] = useState("");
  // L'année de sortie, obligatoire : elle range le modèle dans la Boutique.
  const [year, setYear] = useState("");
  const yearOk = /^\d{4}$/.test(year);

  const ofKind = models.filter((model) => model.kind === kind);
  const selected = models.find((model) => model.id === value);
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = ofKind.filter((model) =>
    words.every((word) => `${model.brand} ${model.name}`.toLowerCase().includes(word)),
  );

  async function add() {
    try {
      const model = await createModel({ brand: brand.trim(), name: name.trim(), kind, releaseYear: Number(year) }).unwrap();
      onChange(model);
      setAdding(false);
      setBrand("");
      setName("");
      setYear("");
    } catch {
      // Le message s'affiche sous le formulaire d'ajout.
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm">
        Modèle choisi :{" "}
        {selected ? (
          <strong>
            {selected.brand} {selected.name}
          </strong>
        ) : (
          <span className="text-red">aucun</span>
        )}
      </p>
      <Field id="model-search" label="Chercher un modèle">
        <input
          id="model-search"
          className="input"
          type="search"
          placeholder="15 pro max, galaxy s24, macbook air…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </Field>
      {/* Rien tant qu'on ne tape pas (06/11) : la liste complète chargeait la fenêtre. */}
      {words.length > 0 ? (
        <div className="rounded-lg border border-line p-2">
          <div className="flex flex-wrap gap-2">
            {matches.slice(0, MAX_SHOWN).map((model) => (
              <button
                key={model.id}
                type="button"
                className="chip"
                aria-pressed={model.id === value}
                onClick={() => {
                  onChange(model);
                  setSearch("");
                }}
              >
                <span className="text-ink-muted">{model.brand}</span> {model.name}
              </button>
            ))}
          </div>
          {matches.length > MAX_SHOWN ? (
            <p className="mt-2 text-xs text-ink-muted">
              {matches.length - MAX_SHOWN} autres modèles : précisez la recherche.
            </p>
          ) : null}
          {matches.length === 0 ? <p className="text-sm text-ink-muted">Aucun modèle trouvé.</p> : null}
        </div>
      ) : (
        <p className="text-xs text-ink-muted">{ofKind.length} modèles : tapez quelques lettres pour les trouver.</p>
      )}

      {adding ? (
        <div className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-[1fr_2fr_7rem_auto] sm:items-end">
          <Field id="new-brand" label="Marque">
            <input id="new-brand" className="input" value={brand} onChange={(event) => setBrand(event.target.value)} />
          </Field>
          <Field id="new-name" label="Nom du modèle">
            <input id="new-name" className="input" value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field id="new-year" label="Année de sortie">
            <input
              id="new-year"
              className="input"
              inputMode="numeric"
              placeholder="2026"
              value={year}
              onChange={(event) => setYear(event.target.value.trim())}
            />
          </Field>
          <button
            type="button"
            className="btn btn-primary"
            onClick={add}
            disabled={isLoading || !brand.trim() || !name.trim() || !yearOk}
          >
            Ajouter
          </button>
          {error ? <p className="field-error sm:col-span-4">{errorMessage(error)}</p> : null}
        </div>
      ) : (
        <button type="button" className="text-sm font-semibold text-blue-ink underline" onClick={() => setAdding(true)}>
          Le modèle n&apos;est pas dans la liste ? L&apos;ajouter
        </button>
      )}
    </div>
  );
}
