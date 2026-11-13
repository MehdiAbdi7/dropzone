import type { ReactNode } from "react";
import { FREE_SHIPPING_LABEL } from "@/config/shipping";
import type { Fulfillment } from "@/features/orders/ordersApi";
import { formatPrice } from "@/lib/format";
import type { CartPreview } from "@/types/api";

// Le total, recalculé par le serveur. Le front ne fait aucun calcul de prix.
// `fulfillment` (14/11) : un retrait au magasin n'a pas de livraison, il se paie au magasin.
export default function CartSummary({
  preview,
  fulfillment = "delivery",
  children,
}: {
  preview: CartPreview;
  fulfillment?: Fulfillment;
  children?: ReactNode;
}) {
  const pickup = fulfillment === "pickup";
  return (
    <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-6" aria-label="Total">
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">Articles</dt>
          <dd>{formatPrice(preview.subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">{pickup ? "Retrait au magasin" : "Livraison"}</dt>
          <dd>{pickup ? "Gratuit" : preview.shippingFee === 0 ? "Offerte" : formatPrice(preview.shippingFee)}</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-line pt-3 text-base">
          <dt className="font-semibold">Total TTC</dt>
          <dd className="font-display text-2xl font-bold">{formatPrice(preview.total)}</dd>
        </div>
      </dl>
      <p className="text-xs text-ink-muted">
        {pickup ? "Paiement au magasin, quand vous récupérez votre commande." : `Paiement à la livraison. ${FREE_SHIPPING_LABEL}`}
      </p>
      {children}
    </aside>
  );
}
