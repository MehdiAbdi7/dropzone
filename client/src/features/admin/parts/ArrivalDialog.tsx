"use client";

import { useState, type FormEvent } from "react";
import { useAddArrivalMutation, type PartRow } from "@/features/admin/api/partsApi";
import EditDialog from "@/features/admin/products/EditDialog";
import { errorMessage } from "@/lib/errors";
import { formatPrice } from "@/lib/format";
import { arrivalProblem, averageAfterArrival } from "./partsView";

const toNumber = (text: string) => (text.trim() === "" ? Number.NaN : Number(text));
const digits = (text: string) => text.replace(/\D/g, "");

// « + Arrivage » : des pièces reçues, avec leur prix d'achat unitaire (0 DA pour des pièces récupérées sur un
// appareil démonté). Le prix d'achat de la pièce devient la moyenne de ce qu'il y avait et de ce qui arrive : on
// la montre avant de valider.
export default function ArrivalDialog({ open, part, onClose }: { open: boolean; part: PartRow; onClose: () => void }) {
  return (
    <EditDialog open={open} title={`Arrivage : ${part.name}`} size="sm" onClose={onClose} closeLabel="Annuler">
      <ArrivalForm part={part} onDone={onClose} />
    </EditDialog>
  );
}

function ArrivalForm({ part, onDone }: { part: PartRow; onDone: () => void }) {
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [addArrival, { isLoading, error }] = useAddArrivalMutation();

  const arrival = { quantity: toNumber(quantity), unitCost: toNumber(unitCost) };
  const problem = arrivalProblem(arrival);
  const average = averageAfterArrival(part, arrival);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (problem) return;
    try {
      await addArrival({ id: part.id, ...arrival }).unwrap();
      onDone();
    } catch {
      // L'erreur RTK Query est affichée sous le bouton ; la saisie reste telle quelle.
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <p className="text-sm text-ink-muted">
        En stock : {part.stock} · prix d&apos;achat actuel : {formatPrice(part.purchasePrice)}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          <span className="label">Quantité reçue</span>
          <input className="input" inputMode="numeric" value={quantity} onChange={(event) => setQuantity(digits(event.target.value))} />
        </label>
        <label className="block text-sm font-semibold">
          <span className="label">Prix d&apos;achat unitaire (DA)</span>
          <input className="input" inputMode="numeric" value={unitCost} onChange={(event) => setUnitCost(digits(event.target.value))} />
        </label>
      </div>
      {average !== null ? (
        <p className="rounded-md bg-surface-2 p-3 text-sm font-semibold" aria-live="polite">
          Après l&apos;arrivage : {part.stock + arrival.quantity} en stock, prix d&apos;achat moyen {formatPrice(average)}.
        </p>
      ) : null}
      {problem ? <p className="text-sm text-ink-muted">{problem}</p> : null}
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={isLoading || problem !== null}>
        {isLoading ? "Enregistrement…" : "Enregistrer l'arrivage"}
      </button>
    </form>
  );
}
