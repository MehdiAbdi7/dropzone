"use client";

import { useState } from "react";
import { CHOICE_GROUP_LABELS, KIND_LABELS, type ChoiceGroup } from "@/config/catalog";
import type { ProductKind } from "@/types/api";
import { useChoicesQuery, useCreateChoiceListMutation, useCreateChoiceMutation, useDeleteChoiceListMutation, useDeleteChoiceMutation, useUpdateChoiceListMutation, useUpdateChoiceMutation, type Choice, type ChoiceList } from "@/features/admin/api/choicesApi";
import EditDialog from "@/features/admin/products/EditDialog";
import { errorMessage } from "@/lib/errors";

const KINDS = Object.keys(KIND_LABELS) as ProductKind[];
const listKey = (list: ChoiceList) => list.group ?? `list:${list.id}`;
const normalize = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

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
          Crée et organise les listes utilisées dans les fiches produit. Les valeurs enregistrées sur les produits
          restent inchangées si une valeur est renommée ou supprimée.
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
        <ListDialog key={active.id} list={active} values={data?.values[listKey(active)] ?? []} onClose={() => setSelectedId(null)} />
      ) : null}
    </section>
  );
}

function KindPicker({
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

function ListDialog({ list, values, onClose }: { list: ChoiceList; values: Choice[]; onClose: () => void }) {
  const [updateList, updateState] = useUpdateChoiceListMutation();
  const [deleteList, deleteState] = useDeleteChoiceListMutation();
  const [createChoice, createState] = useCreateChoiceMutation();
  const [name, setName] = useState(list.name);
  const [kinds, setKinds] = useState(list.kinds);
  const [multiple, setMultiple] = useState(list.multiple);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [hue, setHue] = useState("#808080");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const filtered = values.filter((choice) => normalize(choice.label).includes(normalize(search.trim())));
  const isColor = list.group === "color";

  async function saveList() {
    try {
      await updateList({ id: list.id, name: name.trim(), kinds, multiple }).unwrap();
    } catch {
      // L'erreur RTK Query est affichée dans la fenêtre.
    }
  }

  async function addValue(event: React.FormEvent) {
    event.preventDefault();
    const label = draft.trim();
    if (!label) return;
    try {
      if (isColor) {
        await createChoice({ group: "color", label, hex: hue }).unwrap();
      } else if (list.group) {
        await createChoice({ group: list.group, label }).unwrap();
      } else {
        await createChoice({ listId: list.id, label }).unwrap();
      }
      setDraft("");
    } catch {
      // L'erreur RTK Query est affichée dans la fenêtre.
    }
  }

  async function removeList() {
    try {
      await deleteList(list.id).unwrap();
      onClose();
    } catch {
      // L'erreur RTK Query est affichée dans la fenêtre.
    }
  }

  const toolbar = (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="label">Intitulé</span>
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" className="size-4" checked={multiple} onChange={(event) => setMultiple(event.target.checked)} />
          Plusieurs choix
        </label>
      </div>
      <KindPicker value={kinds} onChange={setKinds} label="Visible dans les catégories" />
      <button type="button" className="btn btn-secondary btn-small" disabled={updateState.isLoading || !name.trim()} onClick={saveList}>
        Enregistrer la liste
      </button>
      {updateState.error ? <p className="field-error">{errorMessage(updateState.error)}</p> : null}
      <form onSubmit={addValue} className="flex gap-2">
        {isColor ? (
          <input type="color" aria-label="Teinte de la nouvelle couleur" className="size-10 shrink-0" value={hue} onChange={(event) => setHue(event.target.value)} />
        ) : null}
        <label className="min-w-0 flex-1">
          <span className="sr-only">Nouvelle valeur</span>
          <input className="input" placeholder="Nouvelle valeur…" value={draft} onChange={(event) => setDraft(event.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary btn-small" disabled={createState.isLoading || !draft.trim()}>Ajouter</button>
      </form>
      {createState.error ? <p className="field-error">{errorMessage(createState.error)}</p> : null}
      <label className="block">
        <span className="sr-only">Rechercher une valeur</span>
        <input type="search" className="input" placeholder={`Rechercher parmi ${values.length} valeurs…`} value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>
    </div>
  );

  return (
    <EditDialog open title={list.name} onClose={onClose} toolbar={toolbar}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-muted">{values.length} valeurs dans cette liste.</p>
        {confirmDelete ? (
          <span className="flex items-center gap-2">
            <span className="text-sm">Supprimer la liste et ses valeurs ?</span>
            <button type="button" className="btn btn-danger btn-small" disabled={deleteState.isLoading} onClick={removeList}>Confirmer</button>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => setConfirmDelete(false)}>Annuler</button>
          </span>
        ) : (
          <button type="button" className="btn btn-danger btn-small" onClick={() => setConfirmDelete(true)}>Supprimer la liste</button>
        )}
      </div>
      {deleteState.error ? <p className="field-error">{errorMessage(deleteState.error)}</p> : null}
      {filtered.length === 0 ? (
        <p className="text-sm text-ink-muted">{search ? "Aucune valeur ne correspond." : "Aucune valeur."}</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((choice) => <ChoiceRow key={choice.id} choice={choice} isColor={isColor} />)}
        </ul>
      )}
    </EditDialog>
  );
}

function ChoiceRow({ choice, isColor }: { choice: Choice; isColor: boolean }) {
  const [label, setLabel] = useState(choice.label);
  const [hex, setHex] = useState(choice.hex ?? "#808080");
  const [update, updateState] = useUpdateChoiceMutation();
  const [remove, removeState] = useDeleteChoiceMutation();

  async function save() {
    try {
      await update({ id: choice.id, label: label.trim(), ...(isColor ? { hex } : {}) }).unwrap();
    } catch {
      // L'erreur RTK Query est affichée dans la ligne.
    }
  }

  async function removeValue() {
    try {
      await remove(choice.id).unwrap();
    } catch {
      // L'erreur RTK Query est affichée dans la ligne.
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-line p-2">
      {isColor ? <input type="color" aria-label={`Teinte de ${choice.label}`} className="size-9 shrink-0" value={hex} onChange={(event) => setHex(event.target.value)} /> : null}
      <input className="input min-w-0 flex-1" value={label} onChange={(event) => setLabel(event.target.value)} />
      <button type="button" className="btn btn-secondary btn-small" disabled={updateState.isLoading || !label.trim()} onClick={save}>Enregistrer</button>
      <button type="button" className="btn btn-danger btn-small" disabled={removeState.isLoading} aria-label={`Supprimer ${choice.label}`} onClick={removeValue}>Supprimer</button>
      {updateState.error || removeState.error ? <p className="field-error w-full">{errorMessage(updateState.error ?? removeState.error)}</p> : null}
    </li>
  );
}
