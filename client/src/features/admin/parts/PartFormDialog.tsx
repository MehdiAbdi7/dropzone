"use client";

import { useState, type FormEvent } from "react";
import { useCreatePartMutation, usePartCategoriesQuery, useUpdatePartMutation, type PartRow } from "@/features/admin/api/partsApi";
import EditDialog from "@/features/admin/products/EditDialog";
import { errorMessage } from "@/lib/errors";
import { categoryChoiceProblem, partDraftProblem, partEditProblem, partPatchBody } from "./partsView";

// Un nombre vide reste vide (NaN) : on ne l'envoie jamais comme 0.
const toNumber = (text: string) => (text.trim() === "" ? Number.NaN : Number(text));
const digits = (text: string) => text.replace(/\D/g, "");

// La fenêtre « Modifier » d'une pièce (la création passe par « Ajout et personnalisation », qui reprend le même
// formulaire) : le nom, la catégorie et les prix. Le stock ne change pas ici : il bouge par un arrivage ou une
// correction, qui laissent une trace dans le journal.
export default function PartFormDialog({ open, part, onClose }: { open: boolean; part: PartRow; onClose: () => void }) {
  return (
    <EditDialog open={open} title={`Modifier : ${part.name}`} size="sm" onClose={onClose} closeLabel="Annuler">
      <PartForm part={part} onDone={onClose} />
    </EditDialog>
  );
}

// Le formulaire d'une pièce : sans `part`, une création (on choisit d'abord la catégorie, comme pour un produit) ;
// avec `part`, une modification. Monté seulement fenêtre ouverte : le brouillon repart à zéro à chaque ouverture.
// À la création, un stock de départ s'écrit comme un premier arrivage.
export function PartForm({
  part,
  initialCategoryId = null,
  onDone,
}: {
  part?: PartRow | null;
  // La catégorie déjà choisie à l'ouverture (celle ouverte sur la page).
  initialCategoryId?: number | null;
  // Appelé une fois la pièce enregistrée, avec son nom (la fenêtre de création le cite dans sa confirmation).
  onDone: (name: string) => void;
}) {
  const edited = part ?? null;
  const [name, setName] = useState(edited?.name ?? "");
  const [categoryId, setCategoryId] = useState<number | null>(edited?.categoryId ?? initialCategoryId);
  const [purchase, setPurchase] = useState(edited ? String(edited.purchasePrice) : "");
  const [sale, setSale] = useState(edited ? String(edited.salePrice) : "");
  const [stock, setStock] = useState("0");
  const { data: categories } = usePartCategoriesQuery();
  const [create, creating] = useCreatePartMutation();
  const [update, updating] = useUpdatePartMutation();
  const { isLoading, error } = edited ? updating : creating;

  const draft = { name, purchasePrice: toNumber(purchase), salePrice: toNumber(sale), stock: toNumber(stock) };
  // En modification, on n'envoie que ce qui a changé (partPatchBody) : rien n'a changé, rien à enregistrer.
  const patch = edited ? partPatchBody(edited, { ...draft, categoryId: categoryId ?? undefined }) : null;
  const problem = edited
    ? (partEditProblem(draft) ?? (Object.keys(patch ?? {}).length === 0 ? "Rien n'a changé." : null))
    : (categoryChoiceProblem(categoryId) ?? partDraftProblem(draft));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (problem || categoryId === null) return;
    try {
      if (edited) {
        await update({ id: edited.id, body: patch! }).unwrap();
      } else {
        await create({ name: name.trim(), categoryId, purchasePrice: draft.purchasePrice, salePrice: draft.salePrice, stock: draft.stock }).unwrap();
      }
      onDone(name.trim());
    } catch {
      // L'erreur RTK Query est affichée sous le bouton ; le formulaire reste tel quel.
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <fieldset className="space-y-2">
        <legend className="label">Catégorie</legend>
        <div className="flex flex-wrap gap-2">
          {categories?.map((category) => (
            <button key={category.id} type="button" className="chip" aria-pressed={categoryId === category.id} onClick={() => setCategoryId(category.id)}>
              {category.name}
            </button>
          ))}
        </div>
        {categories?.length === 0 ? <p className="text-sm text-ink-muted">Aucune catégorie : crée-en une d&apos;abord dans l&apos;onglet « Catégories ».</p> : null}
      </fieldset>
      <label className="block text-sm font-semibold">
        <span className="label">Nom de la pièce</span>
        <input className="input" autoComplete="off" maxLength={80} placeholder="Batterie iPhone 13" value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          <span className="label">Prix d&apos;achat (DA)</span>
          <input className="input" inputMode="numeric" value={purchase} onChange={(event) => setPurchase(digits(event.target.value))} />
        </label>
        <label className="block text-sm font-semibold">
          <span className="label">Prix de vente (DA)</span>
          <input className="input" inputMode="numeric" value={sale} onChange={(event) => setSale(digits(event.target.value))} />
        </label>
      </div>
      {edited ? (
        <p className="text-sm text-ink-muted">
          Le prix d&apos;achat est une moyenne recalculée à chaque arrivage : ne le change ici que pour corriger une erreur. Le stock se change par
          « + Arrivage » ou « Journal ».
        </p>
      ) : (
        <label className="block text-sm font-semibold">
          <span className="label">Stock de départ</span>
          <input className="input w-40" inputMode="numeric" value={stock} onChange={(event) => setStock(digits(event.target.value))} />
        </label>
      )}
      {problem ? <p className="text-sm text-ink-muted">{problem}</p> : null}
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={isLoading || problem !== null}>
        {isLoading ? "Enregistrement…" : edited ? "Enregistrer" : "Créer la pièce"}
      </button>
    </form>
  );
}
