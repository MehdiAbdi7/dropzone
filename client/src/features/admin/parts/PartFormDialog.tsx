"use client";

import { useState, type FormEvent } from "react";
import { useCreatePartMutation, useUpdatePartMutation, type PartRow } from "@/features/admin/api/partsApi";
import EditDialog from "@/features/admin/products/EditDialog";
import { errorMessage } from "@/lib/errors";
import { partDraftProblem } from "./partsView";

// Un nombre vide reste vide (NaN) : on ne l'envoie jamais comme 0.
const toNumber = (text: string) => (text.trim() === "" ? Number.NaN : Number(text));
const digits = (text: string) => text.replace(/\D/g, "");

// La fenêtre « Nouvelle pièce » (sans `part`) ou « Modifier » (avec `part`) : le nom et les prix. Le stock ne se
// change pas ici : il bouge par un arrivage ou une correction, qui laissent une trace dans le journal. À la
// création, un stock de départ s'écrit comme un premier arrivage.
export default function PartFormDialog({ open, part, onClose }: { open: boolean; part?: PartRow | null; onClose: () => void }) {
  return (
    <EditDialog open={open} title={part ? `Modifier : ${part.name}` : "Nouvelle pièce"} size="sm" onClose={onClose} closeLabel="Annuler">
      <PartForm part={part ?? null} onDone={onClose} />
    </EditDialog>
  );
}

// Monté seulement fenêtre ouverte (EditDialog) : le brouillon repart à zéro à chaque ouverture.
function PartForm({ part, onDone }: { part: PartRow | null; onDone: () => void }) {
  const [name, setName] = useState(part?.name ?? "");
  const [purchase, setPurchase] = useState(part ? String(part.purchasePrice) : "");
  const [sale, setSale] = useState(part ? String(part.salePrice) : "");
  const [stock, setStock] = useState("0");
  const [create, creating] = useCreatePartMutation();
  const [update, updating] = useUpdatePartMutation();
  const { isLoading, error } = part ? updating : creating;

  const draft = { name, purchasePrice: toNumber(purchase), salePrice: toNumber(sale), stock: part ? part.stock : toNumber(stock) };
  const problem = partDraftProblem(draft);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (problem) return;
    try {
      if (part) {
        await update({ id: part.id, body: { name: name.trim(), purchasePrice: draft.purchasePrice, salePrice: draft.salePrice } }).unwrap();
      } else {
        await create({ name: name.trim(), purchasePrice: draft.purchasePrice, salePrice: draft.salePrice, stock: draft.stock }).unwrap();
      }
      onDone();
    } catch {
      // L'erreur RTK Query est affichée sous le bouton ; le formulaire reste tel quel.
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
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
      {part ? (
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
        {isLoading ? "Enregistrement…" : part ? "Enregistrer" : "Créer la pièce"}
      </button>
    </form>
  );
}
