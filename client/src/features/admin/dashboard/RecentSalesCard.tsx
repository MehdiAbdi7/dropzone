import Link from "next/link";
import ProductImage from "@/components/ui/ProductImage";
import { ORDER_TYPE_LABELS } from "@/config/catalog";
import type { RecentSale } from "@/features/admin/api/overviewApi";
import { algiersDate } from "@/lib/algiersTime";
import { formatOptions, formatPrice } from "@/lib/format";
import { relativeDayLabel } from "./chartMath";

// Les derniers produits vendus (20/11) : les ventes les plus récentes, avec la photo, le canal et le jour. Un clic
// ouvre la commande. Les cadeaux n'y sont pas, ni ce qui n'est pas une vente (réservation non payée, annulation).
export default function RecentSalesCard({ sales, loading, now }: { sales: RecentSale[] | undefined; loading: boolean; now: Date }) {
  const today = algiersDate(now);
  return (
    <section aria-labelledby="dernieres" className="card flex h-full flex-col gap-3 p-4 sm:p-5">
      <h2 id="dernieres" className="text-lg">
        Derniers produits vendus
      </h2>
      {/* Sans vente, le message est centré dans la carte : elle reste aussi haute que sa voisine, sans vide au-dessus. */}
      {loading ? (
        <p className="grid flex-1 place-content-center py-8 text-sm text-ink-muted">Chargement…</p>
      ) : !sales || sales.length === 0 ? (
        <p className="grid flex-1 place-content-center py-8 text-sm text-ink-muted">Aucune vente pour le moment.</p>
      ) : (
        <ul className="divide-y divide-[var(--admin-line)]">
          {sales.map((sale, index) => (
            <li key={`${sale.orderId}-${index}`}>
              <Link
                href={`/admin/commandes/${sale.orderId}`}
                className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-2"
              >
                <span className="relative block size-12 shrink-0 overflow-hidden rounded-lg bg-surface-2 sm:size-14">
                  <ProductImage src={sale.image} alt="" sizes="56px" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 font-semibold leading-snug">{sale.name}</span>
                  <span className="line-clamp-2 text-xs text-ink-muted">
                    {Object.keys(sale.options ?? {}).length > 0 ? `${formatOptions(sale.options)} · ` : ""}
                    {ORDER_TYPE_LABELS[sale.type]} · n° {sale.dailyNumber}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-bold tabular-nums">{formatPrice(sale.unitPrice * sale.quantity)}</span>
                  <span className="block text-xs text-ink-muted">
                    {relativeDayLabel(sale.soldOn, today)}
                    {sale.quantity > 1 ? ` · × ${sale.quantity}` : ""}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
