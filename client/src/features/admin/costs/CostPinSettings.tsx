"use client";

import { useState, type FormEvent } from "react";
import { errorMessage } from "@/lib/errors";
import { useClearCostPinMutation, useCostPinStatusQuery, useSetCostPinMutation } from "./costPinApi";
import { COST_PIN_LENGTH, digitsOnly, isCompletePin } from "./costVisibility";

// Réglages › Code des prix d'achat (27/11, admin seul). L'admin choisit le code à la main et le donne à ses employés :
// avec un code, le back-office cache les prix d'achat, la marge et le bénéfice jusqu'à ce qu'on tape le code. Sans code,
// rien n'est caché. Le code n'est jamais relu ni affiché après coup : pour le changer, on en tape un nouveau.
export default function CostPinSettings({ onDone }: { onDone: () => void }) {
  const status = useCostPinStatusQuery();
  const [save, saving] = useSetCostPinMutation();
  const [clear, clearing] = useClearCostPinMutation();
  const [pin, setPin] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const configured = status.data?.configured ?? false;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setDone(null);
    try {
      await save(pin).unwrap();
      setPin("");
      setDone("Code enregistré. Les prix d'achat sont maintenant cachés : donne ce code à tes employés.");
    } catch {
      // L'erreur de l'API s'affiche sous le formulaire ; le code tapé reste.
    }
  }

  async function remove() {
    if (!window.confirm("Retirer le code ? Les prix d'achat, la marge et le bénéfice seront de nouveau visibles pour tout le monde.")) return;
    setDone(null);
    try {
      await clear().unwrap();
      setDone("Code retiré : les prix d'achat sont visibles pour tous.");
    } catch {
      // Affiché sous le formulaire.
    }
  }

  const error = saving.error ?? clearing.error;

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <p className="text-sm text-ink-muted">
        Avec un code, personne ne voit les prix d&apos;achat, la marge et le bénéfice avant de l&apos;avoir tapé : un client qui regarde l&apos;écran
        d&apos;un vendeur ne les voit pas. Les prix se recachent d&apos;un bouton, au rechargement de la page et après 5 minutes sans toucher à
        l&apos;écran.
      </p>
      <p className="text-sm font-semibold" aria-live="polite">
        {status.isLoading ? "Chargement…" : configured ? "Un code est réglé : les prix d'achat sont cachés." : "Aucun code : les prix d'achat sont visibles pour tous."}
      </p>
      <label className="block">
        <span className="label">{configured ? "Nouveau code" : "Code"} ({COST_PIN_LENGTH} chiffres)</span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={COST_PIN_LENGTH}
          value={pin}
          onChange={(event) => setPin(digitsOnly(event.target.value))}
          className="input font-mono text-lg tracking-[0.4em]"
        />
      </label>
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
      {done ? (
        <p role="status" className="text-sm font-semibold">
          {done}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary" disabled={saving.isLoading || !isCompletePin(pin)}>
          {configured ? "Changer le code" : "Enregistrer le code"}
        </button>
        {configured ? (
          <button type="button" className="btn btn-outline" disabled={clearing.isLoading} onClick={() => void remove()}>
            Retirer le code
          </button>
        ) : null}
        <button type="button" className="btn btn-outline" onClick={onDone}>
          Fermer
        </button>
      </div>
    </form>
  );
}
