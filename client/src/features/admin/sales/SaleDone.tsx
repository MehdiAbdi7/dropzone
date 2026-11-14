import Link from "next/link";
import type { SaleDone as Done } from "@/features/admin/api/salesApi";
import { formatPrice } from "@/lib/format";

// La vente est encaissée : le numéro du jour, le total, et la suite (voir la commande, nouvelle vente).
export default function SaleDone({ sale, onNew }: { sale: Done; onNew: () => void }) {
  return (
    <section role="status" className="card space-y-4 border-blue-ink p-6" aria-labelledby="sale-done-title">
      <h2 id="sale-done-title" className="text-2xl">
        Vente n° {sale.dailyNumber} encaissée
      </h2>
      <p className="text-lg">
        <strong className="font-display tabular-nums">{formatPrice(sale.total)}</strong> sont entrés dans la caisse du jour.
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" onClick={onNew}>
          Nouvelle vente
        </button>
        <Link href={`/admin/commandes/${sale.id}`} className="btn btn-secondary">
          Voir la commande
        </Link>
      </div>
    </section>
  );
}
