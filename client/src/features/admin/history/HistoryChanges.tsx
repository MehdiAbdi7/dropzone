import Link from "next/link";
import type { History } from "@/features/admin/api/historyApi";
import { formatDate } from "@/lib/format";

// Les modifications et suppressions de commande de la période : qui, quand, quoi. Une
// commande supprimée n'a plus de page : son numéro reste en texte.
export default function HistoryChanges({ changes }: { changes: History["changes"] }) {
  if (changes.length === 0) return null;
  return (
    <section aria-labelledby="changes-title" className="space-y-3">
      <h2 id="changes-title" className="text-xl">
        Modifications
      </h2>
      <ul className="card divide-y divide-line">
        {changes.map((change) => (
          <li key={change.id} className="space-y-1 p-3 text-sm">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <strong>{change.kind === "deleted" ? "Supprimée" : "Modifiée"}</strong>
              {change.kind === "edited" && change.orderId ? (
                <Link href={`/admin/commandes/${change.orderId}`} className="text-blue-ink underline">
                  commande suivi {change.orderNumber}
                </Link>
              ) : (
                <span>commande suivi {change.orderNumber}</span>
              )}
              <span className="text-ink-muted">
                {formatDate(change.createdAt)}
                {change.userName ? ` · ${change.userName}` : ""}
              </span>
            </p>
            <p className="text-ink-muted">{change.summary}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
