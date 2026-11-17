import Link from "next/link";
import { canAccess } from "@/features/admin/access";
import type { SaleDone as Done } from "@/features/admin/api/salesApi";
import { useAdminRole } from "@/features/admin/AdminRoleContext";
import { formatPrice } from "@/lib/format";

// La vente est encaissée : le numéro du jour, le total, et la suite (voir la commande, nouvelle vente).
export default function SaleDone({ sale, onNew }: { sale: Done; onNew: () => void }) {
  const role = useAdminRole();
  return (
    <section role="status" className="card space-y-4 border-blue-ink p-6" aria-labelledby="sale-done-title">
      <h2 id="sale-done-title" className="text-2xl">
        Vente n° {sale.dailyNumber} encaissée
      </h2>
      <p className="text-lg">
        <strong className="font-display tabular-nums">{formatPrice(sale.total)}</strong> encaissés, enregistrés dans le journal du
        jour.
      </p>
      {/* Ce que le calcul du ticket a signalé : un cadeau épuisé n'a PAS été offert. */}
      {sale.notices.length > 0 ? (
        <ul role="alert" className="list-disc space-y-1 pl-5 font-semibold text-red">
          {sale.notices.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" onClick={onNew}>
          Nouvelle vente
        </button>
        {/* La vente est confirmée dès sa création : la facture est prête (lot 6). */}
        <Link href={`/admin/facture/${sale.id}`} target="_blank" className="btn btn-secondary">
          Imprimer la facture
        </Link>
        {/* La page Commandes n'est pas pour le vendeur (lot 7). */}
        {canAccess(role, "/admin/commandes") ? (
          <Link href={`/admin/commandes/${sale.id}`} className="btn btn-secondary">
            Voir la commande
          </Link>
        ) : null}
      </div>
    </section>
  );
}
