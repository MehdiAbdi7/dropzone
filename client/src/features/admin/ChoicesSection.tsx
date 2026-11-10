"use client";

import { useState } from "react";
import { CHOICE_GROUP_LABELS, KIND_LABELS, type ChoiceGroup } from "@/config/catalog";
import type { ProductKind } from "@/types/api";
import { useChoicesQuery, useCreateChoiceListMutation } from "@/features/admin/api/choicesApi";
import { errorMessage } from "@/lib/errors";
import ChoiceListDialog, { listKey } from "./ChoiceListDialog";
import KindPicker from "./KindPicker";

// La page Listes : une carte par liste, le formulaire d'une nouvelle liste, et la fenêtre
// de la liste choisie (ChoiceListDialog).
export default function ChoicesSection() {
  const { data, isLoading, error } = useChoicesQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createList, createState] = useCreateChoiceListMutation();
  const [name, setName] = useState("");
  const [kinds, setKinds] = useState<ProductKind[]>([]);
  const [multiple, setMultiple] = useState(false);
  const [group, setGroup] = useState<ChoiceGroup | "">("");
  const lists = data?.lists ?? [];
  const usedGroups = new Set(lists.flatMap((list) => (list.group ? [list.group] : [])));
  const missingGroups = (Object.keys(CHOICE_GROUP_LABELS) as ChoiceGroup[]).filter((value) => !usedGroups.has(value));
  const active = lists.find((list) => list.id === selectedId) ?? null;

  async function addList(event: React.FormEvent) {
    event.preventDefault();
    const listName = name.trim();
    if (!listName || kinds.length === 0) return;
    try {
      await createList({ name: listName, kinds, multiple, ...(group ? { group } : {}) }).unwrap();
      setName("");
      setKinds([]);
      setMultiple(false);
      setGroup("");
    } catch {
      // L'erreur RTK Query est affichée sous le formulaire.
    }
  }

  return (
    <section aria-labelledby="choices" className="space-y-4">
      <div className="space-y-1">
        <h2 id="choices" className="text-2xl">Listes d&apos;options</h2>
        <p className="max-w-3xl text-ink-muted">
          Crée et organise les listes utilisées dans les fiches produit. Renommer une valeur la renomme aussi sur les
          produits qui l&apos;utilisent ; la supprimer ne change aucun produit.
        </p>
      </div>
      {error ? <p className="field-error">{errorMessage(error)}</p> : null}
      {isLoading ? <p className="text-ink-muted">Chargement des listes…</p> : null}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((list) => {
          const values = data?.values[listKey(list)] ?? [];
          return (
            <li key={list.id}>
              <button
                type="button"
                onClick={() => setSelectedId(list.id)}
                className="card flex h-full w-full flex-col gap-3 p-4 text-left transition-[border-color,box-shadow] hover:border-blue-ink hover:shadow-[var(--shadow)]"
              >
                <span className="flex w-full items-baseline justify-between gap-2">
                  <span className="font-display text-lg font-bold">{list.name}</span>
                  <span className="text-sm text-ink-muted">{values.length} valeurs</span>
                </span>
                <span className="text-sm text-ink-muted">
                  {list.kinds.length > 0 ? list.kinds.map((kind) => KIND_LABELS[kind]).join(" · ") : "Aucune catégorie visible"}
                </span>
                <span className="text-sm text-ink-muted">{list.multiple ? "Plusieurs choix" : "Un seul choix"}</span>
                <span className="mt-auto text-sm font-semibold text-blue-ink">Gérer la liste →</span>
              </button>
            </li>
          );
        })}
      </ul>

      <form onSubmit={addList} className="card grid gap-4 p-4 sm:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1.3fr)]">
        <div className="space-y-3">
          <label className="block">
            <span className="label">Nouvelle liste</span>
            <input className="input" placeholder="Ex. Fréquence d'écran" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          {missingGroups.length > 0 ? (
            <label className="block">
              <span className="label">Ou restaurer une liste standard</span>
              <select
                className="input"
                value={group}
                onChange={(event) => {
                  const next = event.target.value as ChoiceGroup | "";
                  setGroup(next);
                  if (next) setName(CHOICE_GROUP_LABELS[next]);
                }}
              >
                <option value="">Liste personnalisée</option>
                {missingGroups.map((value) => <option key={value} value={value}>{CHOICE_GROUP_LABELS[value]}</option>)}
              </select>
            </label>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4" checked={multiple} onChange={(event) => setMultiple(event.target.checked)} />
            Autoriser plusieurs choix
          </label>
          <button type="submit" className="btn btn-primary btn-small" disabled={createState.isLoading || !name.trim() || kinds.length === 0}>
            Créer la liste
          </button>
          {createState.error ? <p className="field-error">{errorMessage(createState.error)}</p> : null}
        </div>
        <KindPicker value={kinds} onChange={setKinds} label="Visible dans les catégories" />
      </form>

      {active ? (
        <ChoiceListDialog key={active.id} list={active} values={data?.values[listKey(active)] ?? []} onClose={() => setSelectedId(null)} />
      ) : null}
    </section>
  );
}
