"use client";

import { useState, type FormEvent } from "react";
import Field from "@/components/ui/Field";
import { errorMessage } from "@/lib/errors";
import { useTrackRepairMutation } from "./ordersApi";
import { parseTrackNumber } from "./repairTrack";
import RepairTrackView from "./RepairTrackView";

// Le suivi d'une réparation sans compte : le numéro (R-1001) et le téléphone laissé au dépôt, dans le corps d'un
// POST, jamais dans l'URL. Même limite d'essais que le suivi de commande côté serveur.
export default function RepairTrackForm() {
  const [track, { data, error, isLoading }] = useTrackRepairMutation();
  const [number, setNumber] = useState("");
  const [phone, setPhone] = useState("");
  const parsed = parseTrackNumber(number);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (Number.isNaN(parsed)) return;
    track({ number: parsed, phone: phone.replace(/[\s.-]/g, "") });
  }

  return (
    <div className="space-y-8">
      <form onSubmit={onSubmit} className="card grid max-w-2xl gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field id="repair-number" label="Numéro de réparation" hint="Il commence par R, par exemple R-1001.">
          <input id="repair-number" className="input" required autoComplete="off" value={number} onChange={(event) => setNumber(event.target.value)} />
        </Field>
        <Field id="repair-phone" label="Téléphone">
          <input id="repair-phone" className="input" type="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} />
        </Field>
        <button type="submit" className="btn btn-primary" disabled={isLoading || Number.isNaN(parsed)}>
          {isLoading ? "Recherche…" : "Suivre"}
        </button>
      </form>
      {number.trim() !== "" && Number.isNaN(parsed) ? (
        <p role="status" className="text-sm text-ink-muted">
          Le numéro ressemble à R-1001 : la lettre R, puis des chiffres.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error, "Aucune réparation ne correspond à ce numéro et ce téléphone.")}
        </p>
      ) : null}
      {data ? <RepairTrackView tracking={data} /> : null}
    </div>
  );
}
