"use client";

import { useState, type FormEvent } from "react";
import Field from "@/components/ui/Field";
import { CHOICE_GROUP_LABELS, KIND_LABELS, type ChoiceGroup } from "@/config/catalog";
import {
  useChoicesQuery,
  useCreateChoiceMutation,
  useCreateModelMutation,
  useDeleteChoiceMutation,
  useDeleteModelMutation,
  useModelsQuery,
  useUpdateModelMutation,
  type DeviceModel,
} from "@/features/admin/adminApi";
import { errorMessage } from "@/lib/errors";
import type { ProductKind } from "@/types/api";

const DEVICE_KINDS: ProductKind[] = ["phone", "laptop", "watch"];

export default function ModelsPage() {
  return (
    <div className="space-y-10">
      <h1 className="text-3xl">Modèles et listes</h1>
      <ModelsSection />
      <ChoicesSection />
    </div>
  );
}

// ---------- Les modèles d'appareils ----------

// L'année d'un modèle, corrigée sur place : enregistrée quand on quitte le champ.
// Une année fausse rangerait mal le modèle dans la Boutique (du plus récent au plus ancien).
function YearField({ model }: { model: DeviceModel }) {
  const [updateModel, { isLoading, error }] = useUpdateModelMutation();
  const [year, setYear] = useState(model.releaseYear ? String(model.releaseYear) : "");

  function save() {
    if (/^\d{4}$/.test(year) && Number(year) !== model.releaseYear) {
      updateModel({ id: model.id, releaseYear: Number(year) });
    }
  }

  return (
    <label className="flex items-center gap-2 text-xs text-ink-muted">
      Année
      <input
        className="input min-h-8 w-20 py-0.5 text-sm"
        inputMode="numeric"
        aria-label={`Année de sortie de ${model.brand} ${model.name}`}
        value={year}
        disabled={isLoading}
        aria-invalid={error ? true : undefined}
        onChange={(event) => setYear(event.target.value.trim())}
        onBlur={save}
      />
      {error ? <span className="text-red">{errorMessage(error)}</span> : null}
    </label>
  );
}

function ModelsSection() {
  const { data: models = [] } = useModelsQuery();
  const [createModel, createState] = useCreateModelMutation();
  const [deleteModel, deleteState] = useDeleteModelMutation();
  const [kind, setKind] = useState<ProductKind>("phone");
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  const [name, setName] = useState("");
  const [year, setYear] = useState("");

  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = models.filter(
    (model) => model.kind === kind && words.every((word) => `${model.brand} ${model.name}`.toLowerCase().includes(word)),
  );

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    try {
      await createModel({ brand, name, kind, releaseYear: Number(year) }).unwrap();
      setName("");
      setYear("");
    } catch {
      // Affiché sous le formulaire.
    }
  }

  return (
    <section aria-labelledby="models" className="space-y-4">
      <h2 id="models" className="text-2xl">
        Modèles d&apos;appareils ({models.length})
      </h2>
      <div className="flex flex-wrap gap-2">
        {DEVICE_KINDS.map((value) => (
          <button key={value} type="button" className="chip" aria-pressed={kind === value} onClick={() => setKind(value)}>
            {KIND_LABELS[value]}
          </button>
        ))}
      </div>
      <label className="block max-w-md">
        <span className="sr-only">Chercher un modèle</span>
        <input
          className="input"
          type="search"
          placeholder="Chercher un modèle…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <ul className="card max-h-96 divide-y divide-line overflow-y-auto">
        {shown.map((model) => (
          <li key={model.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 text-sm">
            <span>
              <span className="text-ink-muted">{model.brand}</span> <strong>{model.name}</strong>
            </span>
            <YearField model={model} />
            {model.usage > 0 ? (
              <span className="text-xs text-ink-muted">
                utilisé par {model.usage} produit{model.usage > 1 ? "s" : ""}
              </span>
            ) : (
              <button type="button" className="text-xs text-red underline" onClick={() => deleteModel(model.id)}>
                Supprimer
              </button>
            )}
          </li>
        ))}
      </ul>
      {deleteState.error ? <p className="field-error">{errorMessage(deleteState.error)}</p> : null}

      <form onSubmit={onCreate} className="card grid gap-4 p-5 sm:grid-cols-[1fr_2fr_7rem_auto] sm:items-end">
        <Field id="model-brand" label="Marque">
          <input id="model-brand" className="input" value={brand} onChange={(event) => setBrand(event.target.value)} />
        </Field>
        <Field id="model-name" label={`Nouveau modèle (${KIND_LABELS[kind].toLowerCase()})`}>
          <input id="model-name" className="input" value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field id="model-year" label="Année de sortie">
          <input
            id="model-year"
            className="input"
            inputMode="numeric"
            placeholder="2026"
            value={year}
            onChange={(event) => setYear(event.target.value.trim())}
          />
        </Field>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={createState.isLoading || !brand.trim() || !name.trim() || !/^\d{4}$/.test(year)}
        >
          Ajouter
        </button>
        {createState.error ? <p className="field-error sm:col-span-4">{errorMessage(createState.error)}</p> : null}
      </form>
    </section>
  );
}

// ---------- Les listes à cocher ----------

function ChoicesSection() {
  const { data: choices } = useChoicesQuery();
  const [createChoice, createState] = useCreateChoiceMutation();
  const [deleteChoice] = useDeleteChoiceMutation();
  const [drafts, setDrafts] = useState<Partial<Record<ChoiceGroup, string>>>({});

  async function add(group: ChoiceGroup) {
    const label = drafts[group]?.trim();
    if (!label) {
      return;
    }
    try {
      await createChoice({ group, label }).unwrap();
      setDrafts({ ...drafts, [group]: "" });
    } catch {
      // Affiché sous la liste.
    }
  }

  return (
    <section aria-labelledby="choices" className="space-y-4">
      <h2 id="choices" className="text-2xl">
        Listes à cocher
      </h2>
      <p className="max-w-2xl text-ink-muted">
        Les valeurs proposées dans le formulaire produit. Retirer une valeur ne change aucun produit : chaque variante
        garde sa copie du texte.
      </p>
      {createState.error ? <p className="field-error">{errorMessage(createState.error)}</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {(Object.keys(CHOICE_GROUP_LABELS) as ChoiceGroup[]).map((group) => (
          <div key={group} className="card space-y-3 p-4">
            <h3 className="text-lg">{CHOICE_GROUP_LABELS[group]}</h3>
            <ul className="flex flex-wrap gap-2">
              {choices?.[group].map((choice) => (
                <li key={choice.id} className="chip cursor-default">
                  {choice.label}
                  <button
                    type="button"
                    className="text-ink-muted hover:text-red"
                    aria-label={`Retirer ${choice.label}`}
                    onClick={() => deleteChoice(choice.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                add(group);
              }}
            >
              <label className="flex-1">
                <span className="sr-only">Ajouter à {CHOICE_GROUP_LABELS[group]}</span>
                <input
                  className="input min-h-9 py-1 text-sm"
                  placeholder="Nouvelle valeur…"
                  value={drafts[group] ?? ""}
                  onChange={(event) => setDrafts({ ...drafts, [group]: event.target.value })}
                />
              </label>
              <button type="submit" className="btn btn-secondary btn-small">
                Ajouter
              </button>
            </form>
          </div>
        ))}
      </div>
    </section>
  );
}
