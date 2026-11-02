"use client";

import { useState, type FormEvent } from "react";
import Field from "@/components/ui/Field";
import { errorMessage } from "@/lib/errors";
import OrderDetailView from "./OrderDetailView";
import { useTrackOrderMutation } from "./ordersApi";

// Le suivi sans compte : le numéro seul se devine (1001, 1002…), il faut aussi le
// téléphone. Les deux partent dans le corps d'une requête POST, jamais dans l'URL.
export default function TrackForm({ initialNumber }: { initialNumber?: string }) {
  const [track, { data, error, isLoading }] = useTrackOrderMutation();
  const [number, setNumber] = useState(initialNumber ?? "");
  const [phone, setPhone] = useState("");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    track({ number: Number(number), phone: phone.replace(/[\s.-]/g, "") });
  }

  return (
    <div className="space-y-8">
      <form onSubmit={onSubmit} className="card grid max-w-2xl gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field id="number" label="Numéro de commande">
          <input
            id="number"
            className="input"
            inputMode="numeric"
            required
            value={number}
            onChange={(event) => setNumber(event.target.value)}
          />
        </Field>
        <Field id="track-phone" label="Téléphone">
          <input
            id="track-phone"
            className="input"
            type="tel"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </Field>
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? "Recherche…" : "Suivre"}
        </button>
      </form>
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error, "Aucune commande ne correspond à ce numéro et ce téléphone.")}
        </p>
      ) : null}
      {data ? <OrderDetailView order={data} /> : null}
    </div>
  );
}
