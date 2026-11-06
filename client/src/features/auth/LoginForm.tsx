"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Field from "@/components/ui/Field";
import { errorMessage } from "@/lib/errors";
import { useLoginMutation } from "./authApi";

const schema = z.object({
  email: z.email({ error: "Email invalide" }),
  password: z.string().min(1, { error: "Votre mot de passe" }),
});
type Values = z.infer<typeof schema>;

// `suite` : la page demandée avant la redirection (posée par proxy.ts).
// Seul un chemin interne est accepté, jamais une adresse d'un autre site.
function safeNext(suite: string | undefined, isAdmin: boolean) {
  if (suite && suite.startsWith("/") && !suite.startsWith("//")) {
    return suite;
  }
  return isAdmin ? "/admin" : "/compte";
}

export default function LoginForm({ suite }: { suite?: string }) {
  const [login, { isLoading, error }] = useLoginMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    try {
      const user = await login(values).unwrap();
      // Un vrai chargement de page, pas router.push (06/11) : le routeur de Next garde en
      // mémoire la réponse de /compte reçue avant la connexion, « va sur /connexion »
      // (proxy.ts), et router.push la rejouait : on restait sur la page de connexion.
      // Le cookie vient de changer : toute l'application se recharge avec lui (le panier
      // est gardé dans localStorage, il ne se perd pas).
      window.location.assign(safeNext(suite, user.role === "admin"));
    } catch {
      // Le message de l'API s'affiche sous le formulaire.
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="card max-w-md space-y-4 p-6">
      <Field id="email" label="Email" error={errors.email?.message}>
        <input id="email" {...register("email")} className="input" type="email" autoComplete="email" aria-invalid={!!errors.email} />
      </Field>
      <Field id="password" label="Mot de passe" error={errors.password?.message}>
        <input
          id="password"
          {...register("password")}
          className="input"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
        />
      </Field>
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
        {isLoading ? "Connexion…" : "Se connecter"}
      </button>
      <p className="text-sm text-ink-muted">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="text-blue-ink underline">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}
