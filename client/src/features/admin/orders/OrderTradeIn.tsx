import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { AdminOrder } from "@/features/admin/api/ordersApi";

// Le téléphone que le client a rendu dans un échange (lot 5), avec son prix de reprise et où il en est.
export default function OrderTradeIn({ tradeIn }: { tradeIn: NonNullable<AdminOrder["tradeIn"]> }) {
  return (
    <section aria-labelledby="trade-in-title" className="card space-y-2 p-4">
      <h3 id="trade-in-title" className="text-lg">
        Téléphone repris
      </h3>
      <p className="font-semibold">
        {tradeIn.deviceModel.brand} {tradeIn.deviceModel.name} · {tradeIn.color}
      </p>
      <p className="text-sm">Repris à {formatPrice(tradeIn.price)}, saisi à la main par le magasin.</p>
      <p className="text-sm text-ink-muted">
        {tradeIn.listedAt ? (
          "Déjà en vente dans le catalogue."
        ) : (
          <>
            Pas encore en vente :{" "}
            <Link href="/admin/reprises" className="underline">
              fixer son prix de revente
            </Link>
            .
          </>
        )}
      </p>
    </section>
  );
}
