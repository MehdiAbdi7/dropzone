"use client";

import { useAccountsQuery } from "@/features/admin/api/accountsApi";
import { useMeQuery } from "@/features/auth/authApi";
import { errorMessage } from "@/lib/errors";
import AccountForm from "./AccountForm";
import AccountRow from "./AccountRow";

// La page Comptes (lot 7), réservée à l'admin : qui a accès au back-office, avec quel rôle.
export default function AccountsPage() {
  const { data: accounts, error, isLoading } = useAccountsQuery();
  const { data: me } = useMeQuery();

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl">Comptes</h1>
      <p className="text-ink-muted">
        Les personnes qui peuvent se connecter au back-office. Un compte désactivé est coupé tout de suite, mais reste dans la liste : ses
        ventes gardent son nom.
      </p>
      <AccountForm />
      {isLoading ? <p className="text-ink-muted">Chargement…</p> : null}
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
      <ul className="space-y-3">
        {accounts?.map((account) => (
          <AccountRow key={account.id} account={account} selfId={me?.id} />
        ))}
      </ul>
    </div>
  );
}
