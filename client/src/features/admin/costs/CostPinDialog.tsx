"use client";

import { useEffect, useRef, useState } from "react";
import { errorMessage } from "@/lib/errors";
import EditDialog from "../products/EditDialog";
import { COST_PIN_LENGTH, digitsOnly, isCompletePin } from "./costVisibility";

// La fenêtre du code des prix d'achat (27/11) : quatre chiffres, envoyés à l'API dès le quatrième (pas de bouton à chercher
// sur un téléphone). Un code faux vide le champ et le dit ; trop d'essais ratés, l'API refuse un quart d'heure et le message
// de l'API s'affiche tel quel.
export default function CostPinDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  // Vérifie le code ; lève l'erreur de l'API s'il est faux.
  onSubmit: (pin: string) => Promise<void>;
}) {
  return (
    <EditDialog open={open} title="Code des prix d'achat" size="sm" closeLabel="Annuler" onClose={onClose}>
      {/* Le formulaire n'existe que fenêtre ouverte : il repart d'un champ vide et sans ancien message à chaque ouverture. */}
      {open ? <PinForm onSubmit={onSubmit} /> : null}
    </EditDialog>
  );
}

function PinForm({ onSubmit }: { onSubmit: (pin: string) => Promise<void> }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // Le champ prend le focus à l'ouverture (le clavier numérique s'ouvre tout seul sur téléphone). `autoFocus` ne suffit pas :
  // ce formulaire se monte avant que la fenêtre ne s'ouvre (`showModal`, qui donne le focus au premier bouton), donc le
  // focus est posé juste après, une fois la fenêtre ouverte.
  useEffect(() => {
    const timer = window.setTimeout(() => input.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function submit(value: string) {
    setBusy(true);
    setError(null);
    try {
      await onSubmit(value);
    } catch (failure) {
      setError(errorMessage(failure));
      setPin("");
      setBusy(false);
      input.current?.focus();
    }
    // Un code juste ferme la fenêtre : ce formulaire disparaît, rien d'autre à remettre à jour.
  }

  function change(text: string) {
    const next = digitsOnly(text);
    setPin(next);
    if (isCompletePin(next) && !busy) void submit(next);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">
        Tape le code à {COST_PIN_LENGTH} chiffres pour voir les prix d&apos;achat, la marge et le bénéfice. Ils se recachent d&apos;un bouton, au
        rechargement de la page, ou après 5 minutes sans toucher à l&apos;écran.
      </p>
      <label className="block">
        <span className="label">Code</span>
        <input
          ref={input}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={COST_PIN_LENGTH}
          disabled={busy}
          value={pin}
          onChange={(event) => change(event.target.value)}
          aria-describedby="cost-pin-error"
          className="input text-center font-mono text-2xl tracking-[0.6em]"
        />
      </label>
      <p id="cost-pin-error" role="alert" className="field-error min-h-5">
        {error}
      </p>
      <button type="button" className="btn btn-primary w-full" disabled={busy || !isCompletePin(pin)} onClick={() => void submit(pin)}>
        {busy ? "Vérification…" : "Voir les prix"}
      </button>
    </div>
  );
}
