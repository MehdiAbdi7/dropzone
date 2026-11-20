import Link from "next/link";
import { STATUS_LABELS } from "@/config/catalog";
import { ordersHref } from "@/features/admin/navConfig";
import type { OrderStatus } from "@/types/api";

// Les commandes par statut (20/11), en barres : à la place du bouton qui ouvrait une fenêtre. Ce qui attend le
// magasin (à confirmer, réservée) est en rouge, le reste en bleu, les annulées en gris. Chaque ligne mène à la liste.
const STATUSES: OrderStatus[] = ["pending", "confirmed", "shipped", "delivered", "reserved", "cancelled"];
const NEEDS_ACTION: OrderStatus[] = ["pending", "reserved"];

export default function StatusCard({ counts }: { counts: Partial<Record<OrderStatus, number>> }) {
  const max = Math.max(1, ...STATUSES.map((status) => counts[status] ?? 0));
  return (
    // `flex-1` : dans la colonne de droite du tableau de bord, la carte prend la hauteur que laisse le bouton voisin,
    // et ses lignes se répartissent dessus (`justify-between`) au lieu de laisser un vide en bas.
    <section aria-labelledby="statuts" className="card flex flex-1 flex-col gap-4 p-4 sm:p-5">
      <h2 id="statuts" className="text-lg">
        Commandes par statut
      </h2>
      <ul className="flex flex-1 flex-col justify-between gap-3">
        {STATUSES.map((status) => {
          const count = counts[status] ?? 0;
          const color = status === "cancelled" ? "var(--ink-muted)" : NEEDS_ACTION.includes(status) ? "var(--red)" : "var(--blue)";
          return (
            <li key={status}>
              <Link href={ordersHref(status)} className="group block space-y-1.5">
                <span className="flex items-baseline justify-between text-sm">
                  <span className="font-semibold group-hover:text-blue-ink">{STATUS_LABELS[status]}</span>
                  <span className="font-bold tabular-nums">{count}</span>
                </span>
                <span aria-hidden="true" className="block h-2 overflow-hidden rounded-full bg-surface-2">
                  <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${(count / max) * 100}%`, background: color, opacity: count === 0 ? 0 : 1 }} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
