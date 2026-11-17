import Link from "next/link";
import { canAccess } from "@/features/admin/access";
import type { ExchangeDone as Done } from "@/features/admin/api/exchangeApi";
import { useAdminRole } from "@/features/admin/AdminRoleContext";
import { differenceText } from "./exchange";

// L'échange est enregistré : le numéro du jour, ce que la caisse a reçu ou rendu, et la suite (fixer le
// prix de revente de la reprise, nouvel échange).
export default function ExchangeDone({ exchange, onNew }: { exchange: Done; onNew: () => void }) {
  const role = useAdminRole();
  return (
    <section role="status" className="card space-y-4 border-blue-ink p-6" aria-labelledby="exchange-done-title">
      <h2 id="exchange-done-title" className="text-2xl">
        Échange n° {exchange.dailyNumber} enregistré
      </h2>
      <p className="text-lg">
        <strong className="font-display">{differenceText(exchange.difference)}</strong>
        {exchange.difference === 0 ? "." : ", enregistré dans le journal du jour."}
      </p>
      <p className="text-ink-muted">
        {canAccess(role, "/admin/reprises")
          ? "Le téléphone du client attend dans « Reprises à mettre en vente » : il n'est pas sur le site tant que tu n'as pas fixé son prix de revente."
          : "Le téléphone du client est mis de côté : il n'est pas sur le site tant que le gérant n'a pas fixé son prix de revente."}
      </p>
      {exchange.notices.length > 0 ? (
        <ul role="alert" className="list-disc space-y-1 pl-5 font-semibold text-red">
          {exchange.notices.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" onClick={onNew}>
          Nouvel échange
        </button>
        {/* L'échange est confirmé dès sa création : la facture est prête (lot 6). */}
        <Link href={`/admin/facture/${exchange.id}`} target="_blank" className="btn btn-secondary">
          Imprimer la facture
        </Link>
        {/* Les reprises et la page Commandes ne sont pas pour le vendeur (lot 7). */}
        {canAccess(role, "/admin/reprises") ? (
          <Link href="/admin/reprises" className="btn btn-secondary">
            Fixer le prix de la reprise
          </Link>
        ) : null}
        {canAccess(role, "/admin/commandes") ? (
          <Link href={`/admin/commandes/${exchange.id}`} className="btn btn-secondary">
            Voir la commande
          </Link>
        ) : null}
      </div>
    </section>
  );
}
