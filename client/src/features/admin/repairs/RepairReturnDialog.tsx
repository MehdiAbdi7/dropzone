"use client";

import { useState } from "react";
import { PAYMENT_METHOD_LABELS } from "@/config/catalog";
import { useChangeRepairStatusMutation, type RepairDetail } from "@/features/admin/api/repairsApi";
import EditDialog from "@/features/admin/products/EditDialog";
import { errorMessage } from "@/lib/errors";
import { formatPrice } from "@/lib/format";
import type { PaymentMethod } from "@/types/api";
import { confirmText, repairNumber, returnProblem } from "./repairsView";

const METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

// « Rendre l'appareil » (étape 3) : le client récupère son appareil et paie ce qu'il doit. L'argent entre dans la
// caisse du jour au moment du Rendu, avec le moyen choisi ; sous garantie (ou sans frais), il n'y a rien à payer.
// Une fois rendu, la fiche ne se modifie plus : le dire avant de valider.
export default function RepairReturnDialog({ open, repair, onClose }: { open: boolean; repair: RepairDetail; onClose: () => void }) {
  return (
    <EditDialog open={open} title={`Rendre ${repairNumber(repair.number)}`} size="sm" onClose={onClose} closeLabel="Annuler">
      <ReturnBody repair={repair} onDone={onClose} />
    </EditDialog>
  );
}

// Monté seulement fenêtre ouverte : le moyen choisi repart de zéro à chaque ouverture.
function ReturnBody({ repair, onDone }: { repair: RepairDetail; onDone: () => void }) {
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [change, { isLoading, error }] = useChangeRepairStatusMutation();
  const due = repair.amountDue;
  const problem = returnProblem(due, method);

  async function submit() {
    if (problem) return;
    try {
      await change({ id: repair.id, status: "returned", ...(due > 0 && method ? { method } : {}) }).unwrap();
      onDone();
    } catch {
      // L'erreur RTK Query est affichée sous le bouton (caisse fermée, par exemple) ; la fenêtre reste ouverte.
    }
  }

  return (
    <div className="space-y-4">
      {due > 0 ? (
        <>
          <p className="font-display text-3xl font-bold tabular-nums">{formatPrice(due)}</p>
          <p className="text-sm text-ink-muted">À encaisser maintenant. L&apos;argent entre dans la caisse du jour : elle doit être ouverte.</p>
          <fieldset>
            <legend className="label">Moyen de paiement</legend>
            <div className="flex flex-wrap gap-2">
              {METHODS.map((value) => (
                <button key={value} type="button" className="chip" aria-pressed={method === value} onClick={() => setMethod(value)}>
                  {PAYMENT_METHOD_LABELS[value]}
                </button>
              ))}
            </div>
          </fieldset>
        </>
      ) : (
        <p className="font-semibold">{repair.underWarranty ? "Sous garantie : rien à payer." : "Rien à payer."}</p>
      )}
      <p className="text-sm text-ink-muted">{confirmText("returned", [])}</p>
      {problem ? <p className="text-sm text-ink-muted">{problem}</p> : null}
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
      <button type="button" className="btn btn-primary w-full sm:w-auto" disabled={isLoading || problem !== null} onClick={submit}>
        {isLoading ? "Enregistrement…" : "Rendre l'appareil"}
      </button>
    </div>
  );
}
