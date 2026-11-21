"use client";

import { useState, type FormEvent } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  useCreatePartCategoryMutation,
  useDeletePartCategoryMutation,
  usePartCategoriesQuery,
  useRenamePartCategoryMutation,
} from "@/features/admin/api/partsApi";
import { errorMessage } from "@/lib/errors";
import { categoryNameProblem, type PartCategoryRow } from "./partsView";

// Les catégories de pièces (21/11), gérées à la main : on en ajoute, on les renomme, on les supprime. Une catégorie qui
// contient encore des pièces ne se supprime pas : l'API répond avec ce qu'il faut faire (vider la catégorie d'abord).
export default function PartCategoriesPanel() {
  const { data: categories, error, isLoading } = usePartCategoriesQuery();

  return (
    <div className="space-y-4">
      <AddCategory />
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : isLoading ? (
        <p className="text-ink-muted">Chargement…</p>
      ) : categories?.length ? (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {categories.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </ul>
      ) : (
        <p className="text-ink-muted">Aucune catégorie pour l&apos;instant : ajoute la première (Batterie, Afficheur…).</p>
      )}
    </div>
  );
}

function AddCategory() {
  const [name, setName] = useState("");
  const [create, { isLoading, error, reset }] = useCreatePartCategoryMutation();
  const problem = categoryNameProblem(name);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (problem) return;
    try {
      await create(name.trim()).unwrap();
      setName("");
    } catch {
      // L'erreur (doublon…) est affichée sous le champ ; le nom reste saisi.
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2" noValidate>
      <label className="block text-sm font-semibold">
        <span className="label">Nouvelle catégorie</span>
        <span className="flex gap-2">
          <input className="input" autoComplete="off" maxLength={40} placeholder="Afficheur, Caméra…" value={name} onChange={(event) => {
              setName(event.target.value);
              // L'erreur d'un ajout précédent (doublon…) ne vaut plus pour ce qu'on tape maintenant.
              reset();
            }} />
          <button type="submit" className="btn btn-primary shrink-0" disabled={isLoading || problem !== null}>
            Ajouter
          </button>
        </span>
      </label>
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
    </form>
  );
}

function CategoryRow({ category }: { category: PartCategoryRow }) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(category.name);
  const [rename, renameState] = useRenamePartCategoryMutation();
  const [remove, removeState] = useDeletePartCategoryMutation();
  const problem = categoryNameProblem(name);
  const error = renameState.error ?? removeState.error;

  async function save(event: FormEvent) {
    event.preventDefault();
    if (problem || name.trim() === category.name) {
      setRenaming(false);
      return;
    }
    try {
      await rename({ id: category.id, name: name.trim() }).unwrap();
      setRenaming(false);
    } catch {
      // L'erreur est affichée sous la ligne ; le champ reste ouvert.
    }
  }

  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {renaming ? (
          <form onSubmit={save} className="flex min-w-0 flex-1 basis-56 gap-2" noValidate>
            <input className="input" autoComplete="off" maxLength={40} aria-label={`Nouveau nom de ${category.name}`} value={name} onChange={(event) => setName(event.target.value)} autoFocus />
            <button type="submit" className="btn btn-primary btn-small shrink-0" disabled={renameState.isLoading || problem !== null}>
              Enregistrer
            </button>
          </form>
        ) : (
          <div className="min-w-0 flex-1 basis-56">
            <p className="truncate font-display font-bold">{category.name}</p>
            <p className="text-xs text-ink-muted">
              {category.partsCount} pièce{category.partsCount > 1 ? "s" : ""}
            </p>
          </div>
        )}
        <div className="flex gap-1.5">
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => {
              setName(category.name);
              setRenaming(!renaming);
            }}
          >
            {renaming ? "Annuler" : "Renommer"}
          </button>
          <ConfirmDialog
            trigger="Supprimer"
            triggerClassName="btn btn-danger btn-small"
            title={`Supprimer « ${category.name} » ?`}
            confirmLabel="Supprimer"
            onConfirm={() => remove(category.id)}
          >
            {category.partsCount > 0
              ? `Cette catégorie contient encore ${category.partsCount} pièce${category.partsCount > 1 ? "s" : ""} : elle sera refusée. Déplace d'abord ses pièces dans une autre catégorie (bouton « Modifier » de chaque pièce).`
              : "La catégorie est vide : elle disparaît."}
          </ConfirmDialog>
        </div>
      </div>
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
    </li>
  );
}
