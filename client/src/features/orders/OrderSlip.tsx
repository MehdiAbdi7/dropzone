import { CONDITION_LABELS } from "@/config/catalog";
import { STORE_INFO } from "@/config/storeInfo";
import { warrantyLabel } from "@/config/warranty";
import { formatDate, formatOptions, formatPrice } from "@/lib/format";
import { pickupLabel } from "@/lib/pickupLabel";
import type { OrderDetail } from "@/types/api";

// Le bon de commande du site (lot 6, 15/11) : ce que le client garde après avoir commandé en livraison ou en
// retrait. Il le télécharge (impression ou « Enregistrer en PDF » du navigateur) ou le prend en capture.
// C'est un RÉCAPITULATIF, pas une facture : le prix peut encore être négocié à la livraison ou au retrait, la
// facture vient du magasin. Papier blanc et texte noir quel que soit le thème ; seule la zone `.print-area`
// s'imprime (voir styles/print.css).
export default function OrderSlip({ order }: { order: OrderDetail }) {
  const pickup = order.type === "pickup" && order.pickupDate && order.pickupTime;
  const where = pickup
    ? `Retrait au magasin ${pickupLabel(order.pickupDate!, order.pickupTime!)}`
    : `Livraison${order.commune || order.wilaya ? ` à ${[order.commune, order.wilaya].filter(Boolean).join(", ")}` : ""}`;

  return (
    <article aria-label={`Bon de commande ${order.number}`} className="print-area mx-auto w-full max-w-[148mm] space-y-4 rounded-lg border border-neutral-300 bg-white p-5 text-sm text-black">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-300 pb-3">
        <div>
          <p className="text-xl font-extrabold">{STORE_INFO.name}</p>
          <p className="text-neutral-700">{STORE_INFO.city}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-extrabold tracking-wide">BON DE COMMANDE</p>
          <p className="text-base font-bold">n° {order.number}</p>
          <p className="text-neutral-700">{formatDate(order.createdAt)}</p>
        </div>
      </header>

      <p className="font-semibold">{where}</p>

      <ul className="divide-y divide-neutral-200">
        {order.items.map((item) => (
          <li key={item.sku} className="flex flex-wrap justify-between gap-3 py-2">
            <div>
              <p className="font-semibold">
                {item.quantity} × {item.name}
              </p>
              <p className="text-xs text-neutral-700">
                {CONDITION_LABELS[item.condition]}
                {Object.keys(item.options).length ? ` · ${formatOptions(item.options)}` : ""}
                {warrantyLabel(item.warrantyMonths) ? ` · ${warrantyLabel(item.warrantyMonths)}` : ""}
              </p>
            </div>
            <p className="tabular-nums">{item.isGift ? "Offert" : formatPrice(item.unitPrice * item.quantity)}</p>
          </li>
        ))}
      </ul>

      <div className="ml-auto max-w-56 space-y-1">
        {order.type === "delivery" ? (
          <p className="flex justify-between gap-4">
            <span>Livraison</span>
            <span className="tabular-nums">{order.shippingFee === 0 ? "Offerte" : formatPrice(order.shippingFee)}</span>
          </p>
        ) : null}
        <p className="flex justify-between gap-4 border-t border-neutral-400 pt-1 text-base font-extrabold">
          <span>Total</span>
          <span className="tabular-nums">{formatPrice(order.total)}</span>
        </p>
        <p className="text-xs text-neutral-700">{pickup ? "À payer au magasin" : "À payer à la livraison"}</p>
      </div>

      <p className="border-t border-neutral-300 pt-3 text-xs text-neutral-700">
        Ce bon n&apos;est pas une facture : la facture est remise par le magasin. Pour suivre la commande, indiquez ce numéro et
        votre téléphone sur la page « Suivi ».
      </p>
    </article>
  );
}
