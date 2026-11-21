"use client";

import { useState, type FormEvent } from "react";
import Field from "@/components/ui/Field";
import { errorMessage } from "@/lib/errors";
import { useDecideRepairMutation, useTrackRepairMutation } from "./ordersApi";
import { parseTrackNumber, trackNumberDigits, type RepairTracking } from "./repairTrack";
import RepairTrackView from "./RepairTrackView";

// Le suivi d'une réparation sans compte : le numéro et le téléphone laissé au dépôt, dans le corps d'un POST, jamais
// dans l'URL. Même limite d'essais que le suivi de commande côté serveur. Depuis le 21/11, « R- » est écrit d'avance
// devant le champ et ne s'enlève pas (le client tape 1003, pas R-1003), et le client répond lui-même à son devis.
export default function RepairTrackForm() {
  const [track, { error, isLoading }] = useTrackRepairMutation();
  const [decide, decision] = useDecideRepairMutation();
  const [digits, setDigits] = useState("");
  const [phone, setPhone] = useState("");
  // Le suivi affiché : celui de la recherche, remplacé par la réponse du serveur quand le client accepte ou refuse.
  const [tracking, setTracking] = useState<RepairTracking | null>(null);
  // Ce qui a servi à trouver la fiche : la réponse au devis les renvoie (le client ne retape rien).
  const [found, setFound] = useState<{ number: number; phone: string } | null>(null);
  const parsed = parseTrackNumber(`R-${digits}`);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (Number.isNaN(parsed)) return;
    const body = { number: parsed, phone: phone.replace(/[\s.-]/g, "") };
    setTracking(null);
    decision.reset();
    try {
      setTracking(await track(body).unwrap());
      setFound(body);
    } catch {
      // L'erreur est affichée sous le formulaire.
    }
  }

  async function onDecide(answer: "accept" | "refuse") {
    if (!found) return;
    try {
      setTracking(await decide({ ...found, decision: answer }).unwrap());
    } catch {
      // L'erreur est affichée sous le devis.
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={onSubmit} className="card grid max-w-2xl gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field id="repair-number" label="Numéro de réparation">
          <div className="flex">
            {/* Le « R- » n'est pas dans le champ : il ne peut ni s'effacer ni se déplacer. */}
            <span aria-hidden="true" className="flex select-none items-center rounded-l-[var(--radius-field)] border border-r-0 border-line bg-surface-2 px-3 font-bold text-ink-muted">
              R-
            </span>
            <input
              id="repair-number"
              className="input rounded-l-none"
              required
              inputMode="numeric"
              autoComplete="off"
              maxLength={10}
              placeholder="1003"
              value={digits}
              onChange={(event) => setDigits(trackNumberDigits(event.target.value))}
            />
          </div>
        </Field>
        <Field id="repair-phone" label="Téléphone">
          <input id="repair-phone" className="input" type="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} />
        </Field>
        <button type="submit" className="btn btn-primary" disabled={isLoading || Number.isNaN(parsed)}>
          {isLoading ? "Recherche…" : "Suivre"}
        </button>
      </form>
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error, "Aucune réparation ne correspond à ce numéro et ce téléphone.")}
        </p>
      ) : null}
      {tracking ? (
        <RepairTrackView
          tracking={tracking}
          onDecide={onDecide}
          deciding={decision.isLoading}
          decisionError={decision.error ? errorMessage(decision.error, "La réponse n'a pas pu être enregistrée : appelez le magasin.") : null}
        />
      ) : null}
    </div>
  );
}
