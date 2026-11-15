"use client";

import { useState, type FormEvent } from "react";
import Field from "@/components/ui/Field";
import {
  useChangeEmailMutation,
  useChangePasswordMutation,
  useMeQuery,
  useUpdateMeMutation,
} from "@/features/auth/authApi";
import { errorMessage } from "@/lib/errors";
import type { User } from "@/types/api";
import { emailProblem, passwordProblem } from "./accountForm";

// Mon compte du back-office (15/11) : le nom et le téléphone, l'email de connexion et le mot de passe. L'email et le
// mot de passe demandent TOUJOURS le mot de passe actuel : quelqu'un qui tombe sur une session ouverte ne peut pas
// prendre le compte. L'adresse postale se change sur la page « Mon compte » du site.
export default function AccountSettings() {
  const { data: me, isError } = useMeQuery();
  if (isError) return <p role="alert">Le compte ne répond pas.</p>;
  if (!me) return <p className="text-ink-muted">Chargement…</p>;
  return (
    <div className="space-y-6">
      <ProfileForm me={me} />
      <EmailForm me={me} />
      <PasswordForm />
    </div>
  );
}

// Un nom : 2 à 40 caractères ; un téléphone algérien : 10 chiffres commençant par 0 (comme l'API).
const isPhone = (value: string) => /^0[2-7]\d{8}$/.test(value.replace(/[\s.-]/g, ""));

function ProfileForm({ me }: { me: User }) {
  const [values, setValues] = useState({ firstName: me.firstName, lastName: me.lastName, phone: me.phone });
  const [save, { isLoading, error, isSuccess }] = useUpdateMeMutation();
  const problem =
    values.firstName.trim().length < 2 || values.lastName.trim().length < 2
      ? "Le prénom et le nom : 2 caractères au minimum."
      : !isPhone(values.phone.trim())
        ? "Le téléphone : 10 chiffres, par exemple 0555 12 34 56."
        : null;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!problem) void save({ firstName: values.firstName.trim(), lastName: values.lastName.trim(), phone: values.phone.trim() });
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5" aria-label="Mes informations">
      <h2 className="text-lg">Mes informations</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="account-first" label="Prénom">
          <input id="account-first" className="input" autoComplete="given-name" value={values.firstName} onChange={(event) => setValues({ ...values, firstName: event.target.value })} />
        </Field>
        <Field id="account-last" label="Nom">
          <input id="account-last" className="input" autoComplete="family-name" value={values.lastName} onChange={(event) => setValues({ ...values, lastName: event.target.value })} />
        </Field>
        <Field id="account-phone" label="Téléphone">
          <input id="account-phone" className="input" inputMode="tel" autoComplete="tel" value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })} />
        </Field>
      </div>
      {problem ? <p className="text-sm text-ink-muted">{problem}</p> : null}
      {error ? <p role="alert" className="field-error">{errorMessage(error)}</p> : null}
      {isSuccess ? <p role="status" className="text-sm font-semibold">Informations enregistrées.</p> : null}
      <button type="submit" className="btn btn-primary" disabled={isLoading || problem !== null}>
        Enregistrer
      </button>
    </form>
  );
}

function EmailForm({ me }: { me: User }) {
  const [email, setEmail] = useState("");
  const [current, setCurrent] = useState("");
  const [change, { isLoading, error, isSuccess }] = useChangeEmailMutation();
  const problem = emailProblem({ current, email, currentEmail: me.email });

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (problem) return;
    try {
      await change({ currentPassword: current, email: email.trim() }).unwrap();
      setEmail("");
      setCurrent("");
    } catch {
      // L'erreur RTK Query est affichée sous les champs ; rien n'est effacé.
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5" aria-label="Email de connexion">
      <div>
        <h2 className="text-lg">Email de connexion</h2>
        <p className="text-sm text-ink-muted">
          Actuellement : <strong>{me.email}</strong>. Vous vous connecterez avec le nouvel email.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="account-email" label="Nouvel email">
          <input id="account-email" className="input" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field id="account-email-password" label="Mot de passe actuel">
          <input id="account-email-password" className="input" type="password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} />
        </Field>
      </div>
      {problem && (email !== "" || current !== "") ? <p className="text-sm text-ink-muted">{problem}</p> : null}
      {error ? <p role="alert" className="field-error">{errorMessage(error)}</p> : null}
      {isSuccess ? <p role="status" className="text-sm font-semibold">Email changé. Connectez-vous avec le nouvel email la prochaine fois.</p> : null}
      <button type="submit" className="btn btn-primary" disabled={isLoading || problem !== null}>
        Changer l&apos;email
      </button>
    </form>
  );
}

function PasswordForm() {
  const [values, setValues] = useState({ current: "", next: "", confirm: "" });
  const [change, { isLoading, error, isSuccess }] = useChangePasswordMutation();
  const problem = passwordProblem(values);
  const touched = values.current !== "" || values.next !== "" || values.confirm !== "";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (problem) return;
    try {
      await change({ currentPassword: values.current, newPassword: values.next }).unwrap();
      setValues({ current: "", next: "", confirm: "" });
    } catch {
      // L'erreur RTK Query est affichée sous les champs ; rien n'est effacé.
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5" aria-label="Mot de passe">
      <div>
        <h2 className="text-lg">Mot de passe</h2>
        <p className="text-sm text-ink-muted">8 caractères au minimum. Les autres appareils déjà connectés le restent jusqu&apos;à l&apos;expiration de leur session.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="account-current" label="Mot de passe actuel">
          <input id="account-current" className="input" type="password" autoComplete="current-password" value={values.current} onChange={(event) => setValues({ ...values, current: event.target.value })} />
        </Field>
        <div className="hidden sm:block" aria-hidden="true" />
        <Field id="account-new" label="Nouveau mot de passe">
          <input id="account-new" className="input" type="password" autoComplete="new-password" value={values.next} onChange={(event) => setValues({ ...values, next: event.target.value })} />
        </Field>
        <Field id="account-confirm" label="Nouveau mot de passe, encore une fois">
          <input id="account-confirm" className="input" type="password" autoComplete="new-password" value={values.confirm} onChange={(event) => setValues({ ...values, confirm: event.target.value })} />
        </Field>
      </div>
      {problem && touched ? <p className="text-sm text-ink-muted">{problem}</p> : null}
      {error ? <p role="alert" className="field-error">{errorMessage(error)}</p> : null}
      {isSuccess ? <p role="status" className="text-sm font-semibold">Mot de passe changé.</p> : null}
      <button type="submit" className="btn btn-primary" disabled={isLoading || problem !== null}>
        Changer le mot de passe
      </button>
    </form>
  );
}
