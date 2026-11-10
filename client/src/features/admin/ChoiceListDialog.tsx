"use client";

import { useState } from "react";
import type { ProductKind } from "@/types/api";
import { useCreateChoiceMutation, useDeleteChoiceListMutation, useDeleteChoiceMutation, useUpdateChoiceListMutation, useUpdateChoiceMutation, type Choice, type ChoiceList } from "@/features/admin/api/choicesApi";
import EditDialog from "@/features/admin/products/EditDialog";
import { errorMessage } from "@/lib/errors";
import KindPicker from "./KindPicker";

// La clé d'une liste dans la réponse de l'API : son groupe, ou « list:<id> » pour une liste créée à la main.
export const listKey = (list: ChoiceList) => list.group ?? `list:${list.id}`;
const normalize = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

// La fenêtre d'une liste : son intitulé, ses catégories, et ses valeurs une par une.
export default function ChoiceListDialog({ list, values, onClose }: { list: ChoiceList; values: Choice[]; onClose: () => void }) {
  const [updateList, updateState] = useUpdateChoiceListMutation();
  const [deleteList, deleteState] = useDeleteChoiceListMutation();
  const [createChoice, createState] = useCreateChoiceMutation();
  const [name, setName] = useState(list.name);
  const [kinds, setKinds] = useState<ProductKind[]>(list.kinds);
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

// Une valeur : son nom (et sa teinte pour une couleur), à enregistrer ou à supprimer.
// Renommer une valeur la renomme aussi sur les produits qui l'utilisent (côté API).
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
