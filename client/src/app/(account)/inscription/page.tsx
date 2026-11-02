import type { Metadata } from "next";
import RegisterForm from "@/features/auth/RegisterForm";

export const metadata: Metadata = { title: "Créer un compte" };

export default function RegisterPage() {
  return (
    <div className="container-page space-y-6 py-10">
      <h1 className="text-3xl">Créer un compte</h1>
      <p className="max-w-md text-ink-muted">
        Avec un compte, vos commandes sont rangées au même endroit et le formulaire se remplit tout seul.
      </p>
      <RegisterForm />
    </div>
  );
}
