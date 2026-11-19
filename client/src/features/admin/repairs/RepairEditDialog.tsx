"use client";

import { useState, type FormEvent } from "react";
import { useUpdateRepairMutation, type RepairDetail, type RepairPatchBody } from "@/features/admin/api/repairsApi";
import EditDialog from "@/features/admin/products/EditDialog";
import { errorMessage } from "@/lib/errors";
import { ClientInputs, DeviceInputs, LaborInput, toLabor } from "./RepairFields";
import { repairDraftProblem } from "./repairsView";

// Ce que « Modifier » envoie : SEULEMENT ce qui a changé. Une main-d'œuvre inchangée ne doit pas être renvoyée :
// hors garantie, la changer pendant la réparation ramène la fiche à « Devis à valider ».
function changes(repair: RepairDetail, next: Record<keyof Omit<RepairPatchBody, "laborPrice">, string> & { laborPrice: number | null }): RepairPatchBody {
  const text = (key: "fullName" | "phone" | "deviceName" | "issue") => (next[key].trim() !== repair[key] ? { [key]: next[key].trim() } : {});
  const optional = (key: "deviceColor" | "deviceState" | "accessories" | "note") =>
    next[key].trim() !== (repair[key] ?? "") ? { [key]: next[key].trim() } : {};
  return {
    ...text("fullName"),
    ...text("phone"),
    ...text("deviceName"),
    ...text("issue"),
    ...optional("deviceColor"),
    ...optional("deviceState"),
    ...optional("accessories"),
    ...optional("note"),
    ...(next.laborPrice !== repair.laborPrice ? { laborPrice: next.laborPrice } : {}),
  };
}

// `noteOnly` : le technicien ne modifie que sa note (ni la main-d'œuvre, ni le client, ni l'appareil) ; sa fiche ne
// contient d'ailleurs pas l'argent du client.
export default function RepairEditDialog({ open, repair, noteOnly = false, onClose }: { open: boolean; repair: RepairDetail; noteOnly?: boolean; onClose: () => void }) {
  return (
    <EditDialog open={open} title={`Modifier la fiche R-${repair.number}`} size="sm" onClose={onClose} closeLabel="Annuler">
      <EditBody repair={repair} noteOnly={noteOnly} onDone={onClose} />
    </EditDialog>
  );
}

// Monté seulement fenêtre ouverte : le brouillon repart de la fiche telle qu'elle est.
function EditBody({ repair, noteOnly, onDone }: { repair: RepairDetail; noteOnly: boolean; onDone: () => void }) {
  const [client, setClient] = useState({ fullName: repair.fullName, phone: repair.phone });
  const [device, setDevice] = useState({
    deviceName: repair.deviceName,
    deviceColor: repair.deviceColor ?? "",
    deviceState: repair.deviceState ?? "",
    issue: repair.issue,
    accessories: repair.accessories ?? "",
  });
  const [labor, setLabor] = useState(repair.laborPrice === null ? "" : String(repair.laborPrice));
  const [note, setNote] = useState(repair.note ?? "");
  const [update, { isLoading, error }] = useUpdateRepairMutation();

  const laborPrice = toLabor(labor);
  // Le technicien n'envoie que sa note : jamais un champ qu'il ne voit pas (la main-d'œuvre n'est pas dans sa fiche).
  const patch: RepairPatchBody = noteOnly ? (note.trim() !== (repair.note ?? "") ? { note: note.trim() } : {}) : changes(repair, { ...client, ...device, note, laborPrice });
  const problem =
    (noteOnly ? null : repairDraftProblem({ ...client, deviceName: device.deviceName, issue: device.issue, laborPrice })) ?? (Object.keys(patch).length === 0 ? "Rien n'a changé." : null);
  const reopensQuote = repair.status === "in_repair" && !repair.underWarranty && "laborPrice" in patch;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (problem) return;
    try {
      await update({ id: repair.id, body: patch }).unwrap();
      onDone();
    } catch {
      // L'erreur RTK Query est affichée sous le bouton.
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {noteOnly ? null : (
        <>
          <ClientInputs value={client} onChange={setClient} />
          <DeviceInputs value={device} onChange={setDevice} />
          <LaborInput value={labor} onChange={setLabor} />
        </>
      )}
      {reopensQuote ? <p className="text-sm font-semibold">Changer la main-d&apos;œuvre pendant la réparation redemande l&apos;accord du client : la fiche revient à « Devis à valider ».</p> : null}
      <label className="block text-sm font-semibold">
        <span className="label">Note du technicien (jamais montrée au client)</span>
        <textarea className="input min-h-20" maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      {problem ? <p className="text-sm text-ink-muted">{problem}</p> : null}
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={isLoading || problem !== null}>
        {isLoading ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
