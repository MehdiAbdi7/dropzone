"use client";

import { useResetAccountPasswordMutation, useUpdateAccountMutation, type Account } from "@/features/admin/api/accountsApi";
import PasswordResetBox from "@/features/admin/customers/PasswordResetBox";
import { errorMessage } from "@/lib/errors";
import { ROLE_LABELS, roleChoices } from "./accountRules";

// Un compte du personnel : son rôle, son état, et ce que l'admin peut en faire. Les protections de l'API (on
// ne se retire pas ses propres droits, on ne devient pas admin par un changement de rôle) se retrouvent ici
// en ne proposant tout simplement pas ces gestes ; si l'API refuse quand même, son message s'affiche.
export default function AccountRow({ account, selfId }: { account: Account; selfId: number | undefined }) {
  const [update, { isLoading, error, reset: clearError }] = useUpdateAccountMutation();
  const [resetPassword] = useResetAccountPasswordMutation();
  const isSelf = account.id === selfId;
  const name = `${account.firstName} ${account.lastName}`;
  // Le mot de passe d'un administrateur se change dans « Mon compte » : l'API refuse de le donner à un autre.
  const canResetPassword = account.role !== "admin";

  function changeRole(role: string) {
    if (role === "") return;
    const warning =
      account.role === "admin"
        ? `Retirer les droits d'administrateur à ${name} ? Il ne pourra plus le redevenir : il faudrait créer un nouveau compte.`
        : null;
    if (warning && !window.confirm(warning)) return;
    clearError();
    void update({ id: account.id, role: role as "order_manager" | "seller" });
  }

  return (
    <li className="card space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {name}
            {isSelf ? <span className="ml-2 text-xs font-normal text-ink-muted">(vous)</span> : null}
          </p>
          <p className="truncate text-sm text-ink-muted">{account.email}</p>
          {account.phone ? <p className="text-sm text-ink-muted">{account.phone}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-bold">{ROLE_LABELS[account.role]}</span>
          {account.disabled ? <span className="rounded-full bg-red-soft px-3 py-1 text-xs font-bold text-red">Désactivé</span> : null}
        </div>
      </div>

      {isSelf ? (
        <p className="text-sm text-ink-muted">Votre propre compte : votre email et votre mot de passe se changent dans « Mon compte ».</p>
      ) : (
        <div className="flex flex-wrap items-start gap-3">
          <label className="text-sm font-semibold">
            <span className="sr-only">Changer le rôle de {name}</span>
            <select className="input" value="" disabled={isLoading} onChange={(event) => changeRole(event.target.value)}>
              <option value="">Changer le rôle…</option>
              {roleChoices(account.role).map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn btn-secondary btn-small"
            disabled={isLoading}
            onClick={() => {
              clearError();
              void update({ id: account.id, disabled: !account.disabled });
            }}
          >
            {account.disabled ? "Réactiver" : "Désactiver"}
          </button>
          {canResetPassword ? (
            <PasswordResetBox name={name} onSubmit={(newPassword) => resetPassword({ id: account.id, newPassword }).unwrap()} />
          ) : null}
        </div>
      )}
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
    </li>
  );
}
