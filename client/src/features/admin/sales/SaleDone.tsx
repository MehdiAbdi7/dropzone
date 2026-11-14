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
        <Link href={`/admin/commandes/${sale.id}`} className="btn btn-secondary">
          Voir la commande
        </Link>
      </div>
    </section>
  );
}
