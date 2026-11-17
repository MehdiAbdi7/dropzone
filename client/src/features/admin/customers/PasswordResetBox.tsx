"use client";

import { useState, type FormEvent } from "react";
import { errorMessage } from "@/lib/errors";
import { generatePassword, resetPasswordProblem } from "./resetPassword";

// Donner un nouveau mot de passe à quelqu'un qui a oublié le sien (clients : 15/11, personnel : lot 7). Pas de
// « mot de passe oublié » par email : l'admin en choisit un (ou le fait proposer) et le donne à la personne, qui le
// changera ensuite elle-même. Le champ est en clair : il faut pouvoir lire le mot de passe à la personne. Après
// l'enregistrement, il reste affiché pour être recopié ; il disparaît quand on ferme.
// `onSubmit` fait l'appel à l'API qui convient (client ou compte du personnel) et lève une erreur s'il échoue.
export default function PasswordResetBox({ name, onSubmit }: { name: string; onSubmit: (newPassword: string) => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const problem = resetPasswordProblem(password);

  function close() {
    setOpen(false);
    setPassword("");
    setDone(null);
    setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (problem) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit(password);
      setDone(password);
      setPassword("");
    } catch (failure) {
      // L'erreur est affichée sous le champ ; rien n'est effacé.
      setError(failure);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-secondary btn-small" onClick={() => setOpen(true)}>
        Nouveau mot de passe
      </button>
    );
  }

  if (done) {
    return (
      <div role="status" className="space-y-2 rounded-md bg-surface-2 p-3 text-sm">
        <p>
          Mot de passe de <strong>{name}</strong> changé. Donnez-lui celui-ci :
        </p>
        <p className="font-mono text-base font-bold select-all">{done}</p>
        <p className="text-ink-muted">Il pourra le changer ensuite depuis son compte. Notez-le maintenant : il ne sera plus affiché.</p>
        <button type="button" className="btn btn-secondary btn-small" onClick={close}>
          Fermer
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2" aria-label={`Nouveau mot de passe de ${name}`}>
      <label className="block text-sm font-semibold">
        <span className="label">Nouveau mot de passe de {name}</span>
        <input className="input" autoComplete="off" value={password} onChange={(event) => setPassword(event.target.value)} />
      </label>
      {password !== "" && problem ? <p className="text-sm text-ink-muted">{problem}</p> : null}
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-secondary btn-small" onClick={() => setPassword(generatePassword())}>
          Proposer un mot de passe
        </button>
        <button type="submit" className="btn btn-primary btn-small" disabled={isLoading || problem !== null}>
          {isLoading ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button type="button" className="btn btn-secondary btn-small" onClick={close}>
          Annuler
        </button>
      </div>
    </form>
  );
}
