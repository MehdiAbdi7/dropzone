"use client";

import { useState, type FormEvent } from "react";
import { useCreateAccountMutation } from "@/features/admin/api/accountsApi";
import { generatePassword } from "@/features/admin/customers/resetPassword";
import { errorMessage } from "@/lib/errors";
import { ROLE_LABELS, STAFF_ROLES, validateAccount, type AccountInput } from "./accountRules";

const EMPTY: AccountInput = { firstName: "", lastName: "", email: "", phone: "", role: "seller", password: "" };

// Créer un compte du personnel (lot 7). L'admin choisit le rôle et un mot de passe provisoire (ou le fait
// proposer) et le donne à la personne, qui le changera ensuite dans « Mon compte ». Le mot de passe est en clair :
// il faut pouvoir le lire à la personne ; après la création il reste affiché une fois, puis disparaît.
export default function AccountForm() {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<AccountInput>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof AccountInput, string>>>({});
  const [created, setCreated] = useState<{ email: string; password: string; role: string } | null>(null);
  const [create, { isLoading, error, reset: clearError }] = useCreateAccountMutation();

  const set = (field: keyof AccountInput, value: string) => setValues((current) => ({ ...current, [field]: value }));

  function close() {
    setOpen(false);
    setValues(EMPTY);
    setErrors({});
    setCreated(null);
    clearError();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const check = validateAccount(values);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    setErrors({});
    try {
      await create(check.value).unwrap();
      setCreated({ email: check.value.email, password: check.value.password, role: ROLE_LABELS[check.value.role] });
      setValues(EMPTY);
    } catch {
      // L'erreur RTK Query est affichée sous le formulaire ; rien n'est effacé.
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        Nouveau compte
      </button>
    );
  }

  if (created) {
    return (
      <div role="status" className="card space-y-3 border-blue-ink p-5">
        <h2 className="text-xl">Compte créé</h2>
        <p>
          Donnez ces identifiants à la personne ({created.role}) :
        </p>
        <p className="space-y-1 font-mono text-base select-all">
          <span className="block">Email : {created.email}</span>
          <span className="block">Mot de passe : {created.password}</span>
        </p>
        <p className="text-ink-muted">Elle pourra changer son mot de passe dans « Mon compte ». Notez-le maintenant : il ne sera plus affiché.</p>
        <button type="button" className="btn btn-secondary" onClick={close}>
          Fermer
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="card space-y-4 p-5" aria-label="Nouveau compte">
      <h2 className="text-xl">Nouveau compte</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          <span className="label">Prénom</span>
          <input className="input" value={values.firstName} onChange={(event) => set("firstName", event.target.value)} aria-invalid={!!errors.firstName} />
          {errors.firstName ? <span className="field-error">{errors.firstName}</span> : null}
        </label>
        <label className="block text-sm font-semibold">
          <span className="label">Nom</span>
          <input className="input" value={values.lastName} onChange={(event) => set("lastName", event.target.value)} aria-invalid={!!errors.lastName} />
          {errors.lastName ? <span className="field-error">{errors.lastName}</span> : null}
        </label>
        <label className="block text-sm font-semibold">
          <span className="label">Email de connexion</span>
          <input className="input" type="email" autoComplete="off" value={values.email} onChange={(event) => set("email", event.target.value)} aria-invalid={!!errors.email} />
          {errors.email ? <span className="field-error">{errors.email}</span> : null}
        </label>
        <label className="block text-sm font-semibold">
          <span className="label">Téléphone (facultatif)</span>
          <input className="input" type="tel" value={values.phone} onChange={(event) => set("phone", event.target.value)} aria-invalid={!!errors.phone} />
          {errors.phone ? <span className="field-error">{errors.phone}</span> : null}
        </label>
        <label className="block text-sm font-semibold">
          <span className="label">Rôle</span>
          <select className="input" value={values.role} onChange={(event) => set("role", event.target.value)}>
            {STAFF_ROLES.slice()
              .reverse()
              .map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          <span className="label">Mot de passe provisoire</span>
          <input className="input" autoComplete="off" value={values.password} onChange={(event) => set("password", event.target.value)} aria-invalid={!!errors.password} />
          {errors.password ? <span className="field-error">{errors.password}</span> : null}
        </label>
      </div>
      <p className="text-sm text-ink-muted">
        Le vendeur a la vente, l&apos;échange, la caisse et les réglages. Le responsable commande y ajoute la page Commandes.
        L&apos;administrateur a tout. On devient administrateur à la création seulement : un compte existant ne peut pas le devenir.
      </p>
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-secondary" onClick={() => set("password", generatePassword())}>
          Proposer un mot de passe
        </button>
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? "Création…" : "Créer le compte"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={close}>
          Annuler
        </button>
      </div>
    </form>
  );
}
