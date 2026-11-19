"use client";

import { useState, type FormEvent } from "react";
import { useCorrectStockMutation, usePartMovementsQuery, type PartRow } from "@/features/admin/api/partsApi";
import EditDialog from "@/features/admin/products/EditDialog";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatPrice } from "@/lib/format";
import { useAdminRole } from "@/features/admin/AdminRoleContext";
import { repairCapabilities } from "@/features/admin/repairs/repairsView";
import { movementLabel, stockProblem } from "./partsView";

const digits = (text: string) => text.replace(/\D/g, "");

// Le journal du stock d'une pièce : chaque arrivage et chaque correction, du plus récent au plus ancien, jamais
// modifié. La correction du stock (le stock compté à la main) se fait ici : elle y laisse sa trace.
export default function PartJournalDialog({ open, part, onClose }: { open: boolean; part: PartRow; onClose: () => void }) {
  return (
    <EditDialog open={open} title={`Journal : ${part.name}`} size="sm" onClose={onClose}>
      <Journal part={part} />
    </EditDialog>
  );
}

// Monté seulement fenêtre ouverte : la liste n'est lue qu'à l'ouverture.
function Journal({ part }: { part: PartRow }) {
  // Corriger un stock est à l'admin ; le technicien lit le journal.
  const canCorrect = repairCapabilities(useAdminRole()).editsPart;
  const { data, isLoading, error } = usePartMovementsQuery(part.id);
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [correct, { isLoading: saving, error: saveError }] = useCorrectStockMutation();

  const value = counted.trim() === "" ? Number.NaN : Number(counted);
  const problem = stockProblem(value, part.stock);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (problem) return;
    try {
      await correct({ id: part.id, stock: value, note: note.trim() || undefined }).unwrap();
      setCounted("");
      setNote("");
    } catch {
      // L'erreur RTK Query est affichée sous le bouton.
    }
  }

  return (
    <div className="space-y-4">
      {canCorrect ? (
      <form onSubmit={submit} className="space-y-3 rounded-lg border border-line p-3" noValidate>
        <p className="text-sm font-semibold">Corriger le stock (en stock : {part.stock})</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            <span className="label">Stock compté</span>
            <input className="input" inputMode="numeric" value={counted} onChange={(event) => setCounted(digits(event.target.value))} />
          </label>
          <label className="block text-sm font-semibold">
            <span className="label">Raison (facultatif)</span>
            <input className="input" maxLength={200} value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
        </div>
        {counted !== "" && problem ? <p className="text-sm text-ink-muted">{problem}</p> : null}
        {saveError ? (
          <p role="alert" className="field-error">
            {errorMessage(saveError)}
          </p>
        ) : null}
        <button type="submit" className="btn btn-secondary btn-small" disabled={saving || problem !== null}>
          {saving ? "Enregistrement…" : "Corriger"}
        </button>
      </form>
      ) : null}

      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : isLoading ? (
        <p className="text-ink-muted">Chargement…</p>
      ) : data?.length ? (
        <ul className="space-y-2">
          {data.map((movement) => (
            <li key={movement.id} className="rounded-lg bg-surface-2 p-3 text-sm">
              <p className="flex flex-wrap items-baseline justify-between gap-2 font-semibold">
                <span>{movementLabel(movement)}</span>
                <span className="tabular-nums">En stock : {movement.stockAfter}</span>
              </p>
              <p className="text-ink-muted">
                {formatDate(movement.createdAt)}
                {movement.unitCost !== null ? ` · à ${formatPrice(movement.unitCost)} l'unité` : ""}
                {movement.note ? ` · ${movement.note}` : ""}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-muted">Aucun mouvement pour cette pièce.</p>
      )}
    </div>
  );
}
