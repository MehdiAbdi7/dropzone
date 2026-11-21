"use client";

import { useState } from "react";
import { useUpdateRepairMutation, type RepairDetail } from "@/features/admin/api/repairsApi";
import { errorMessage } from "@/lib/errors";
import { formatPrice } from "@/lib/format";
import { LaborInput, toLabor } from "./RepairFields";
import { laborProblem, repairTotal } from "./repairsView";

// Le prix de la réparation (21/11), là où le technicien voit l'appareil : il ajoute la pièce à changer (ou aucune) et
// fixe la main-d'œuvre, puis propose le devis. Montré à « Reçu » et « Devis à valider », hors garantie seulement (sous
// garantie la réparation est gratuite). Le total que le client verra est affiché sous le champ.
export default function RepairQuote({ repair }: { repair: RepairDetail }) {
  const [labor, setLabor] = useState(repair.laborPrice === null ? "" : String(repair.laborPrice));
  const [update, { isLoading, error }] = useUpdateRepairMutation();
  const value = toLabor(labor);
  const problem = laborProblem(value);
  const changed = value !== repair.laborPrice;
  const partsTotal = repair.parts.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

  async function save() {
    if (problem || !changed) return;
    try {
      await update({ id: repair.id, body: { laborPrice: value } }).unwrap();
    } catch {
      // L'erreur RTK Query est affichée sous le champ ; la saisie reste telle quelle.
    }
  }

  return (
    <section className="space-y-3 border-t border-line pt-3" aria-label="Prix de la réparation">
      <h3 className="text-lg">Prix de la réparation</h3>
      <div className="flex flex-wrap items-end gap-2">
        <LaborInput value={labor} onChange={setLabor} />
        <button type="button" className="btn btn-secondary" disabled={isLoading || !changed || problem !== null} onClick={save}>
          {isLoading ? "Enregistrement…" : "Enregistrer le prix"}
        </button>
      </div>
      {problem ? <p className="text-sm text-ink-muted">{problem}</p> : null}
      <p className="text-sm">
        Pièces {formatPrice(partsTotal)} + main-d&apos;œuvre {repair.laborPrice === null ? <span className="text-ink-muted">à fixer</span> : formatPrice(repair.laborPrice)}
        {" = "}
        <span className="font-bold">{formatPrice(repairTotal(repair))}</span>
      </p>
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
    </section>
  );
}
