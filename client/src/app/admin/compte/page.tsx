import type { Metadata } from "next";
import AccountSettings from "@/features/admin/account/AccountSettings";

export const metadata: Metadata = { title: "Mon compte" };

// Mon compte du back-office (15/11) : nom, téléphone, email de connexion et mot de passe.
export default function AdminAccountPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl">Mon compte</h1>
      <AccountSettings />
    </div>
  );
}
