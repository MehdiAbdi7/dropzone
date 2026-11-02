"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Field from "@/components/ui/Field";
import { errorMessage, fieldErrors } from "@/lib/errors";
import { useRegisterMutation } from "./authApi";

const schema = z.object({
  firstName: z.string().trim().min(2, { error: "Votre prénom" }),
  lastName: z.string().trim().min(2, { error: "Votre nom" }),
  email: z.email({ error: "Email invalide" }),
  phone: z
    .string()
    .transform((value) => value.replace(/[\s.-]/g, ""))
    .pipe(z.string().regex(/^0[2-7]\d{8}$/, { error: "10 chiffres, par exemple 0555 12 34 56" })),
  password: z.string().min(8, { error: "8 caractères au minimum" }).max(72),
});
type Values = z.input<typeof schema>;

export default function RegisterForm() {
  const router = useRouter();
  const [registerUser, { isLoading, error }] = useRegisterMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });
  const serverErrors = fieldErrors(error);

  async function onSubmit(values: Values) {
    try {
      await registerUser(schema.parse(values)).unwrap();
      router.push("/compte");
      router.refresh();
    } catch {
      // Affiché sous le formulaire (email déjà utilisé, champ refusé…).
    }
  }

  const fields = [
    { name: "firstName", label: "Prénom", type: "text", autoComplete: "given-name" },
    { name: "lastName", label: "Nom", type: "text", autoComplete: "family-name" },
    { name: "email", label: "Email", type: "email", autoComplete: "email" },
    { name: "phone", label: "Téléphone", type: "tel", autoComplete: "tel" },
    { name: "password", label: "Mot de passe (8 caractères au minimum)", type: "password", autoComplete: "new-password" },
  ] as const;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="card max-w-md space-y-4 p-6">
      {fields.map((field) => {
        const message = errors[field.name]?.message ?? serverErrors[field.name]?.[0];
        return (
          <Field key={field.name} id={field.name} label={field.label} error={message}>
            <input
              id={field.name}
              {...register(field.name)}
              className="input"
              type={field.type}
              autoComplete={field.autoComplete}
              aria-invalid={!!message}
            />
          </Field>
        );
      })}
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
        {isLoading ? "Création…" : "Créer mon compte"}
      </button>
      <p className="text-sm text-ink-muted">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="text-blue-ink underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
