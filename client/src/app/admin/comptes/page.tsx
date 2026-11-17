import type { Metadata } from "next";
import AccountsPage from "@/features/admin/accounts/AccountsPage";

export const metadata: Metadata = { title: "Comptes" };

// Les comptes du personnel (lot 7) : créer, changer le rôle, désactiver, nouveau mot de passe.
export default function AdminAccountsPage() {
  return <AccountsPage />;
}
