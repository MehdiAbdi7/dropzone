import type { Ref } from "react";
import PrintCopy from "@/components/ui/PrintCopy";
import { CONDITION_LABELS } from "@/config/catalog";
import { STORE_INFO } from "@/config/storeInfo";
import { warrantyLabel } from "@/config/warranty";
import { formatDate, formatOptions, formatPrice } from "@/lib/format";
import { pickupLabel } from "@/lib/pickupLabel";
import type { OrderDetail } from "@/types/api";

// Le bon de commande du site (lot 6, 15/11) : ce que le client garde après avoir commandé en livraison ou en
// retrait. Il l'enregistre en image (le téléphone), l'imprime ou l'enregistre en PDF (l'ordinateur), ou le
// prend en capture. C'est un RÉCAPITULATIF, pas une facture : le prix peut encore être négocié à la livraison
// ou au retrait, la facture vient du magasin. Papier blanc et texte noir quel que soit le thème.
// Il est posé deux fois : à l'écran (`captureRef` en sert à faire l'image), et dans une copie réservée à
// l'impression (voir PrintCopy et styles/print.css).
function Slip({ order, innerRef }: { order: OrderDetail; innerRef?: Ref<HTMLElement> }) {
  const pickup = order.type === "pickup" && order.pickupDate && order.pickupTime;
  const where = pickup
    ? `Retrait au magasin ${pickupLabel(order.pickupDate!, order.pickupTime!)}`
    : `Livraison${order.commune || order.wilaya ? ` à ${[order.commune, order.wilaya].filter(Boolean).join(", ")}` : ""}`;

  return (
    <article
      ref={innerRef}
      aria-label={`Bon de commande ${order.number}`}
      className="mx-auto w-full max-w-[148mm] space-y-4 rounded-lg border border-neutral-300 bg-white p-5 text-sm text-black"
    >
      <header className="grid grid-cols-[1fr_auto] items-start gap-4 border-b border-neutral-300 pb-3">
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
          // Une grille à deux colonnes : le prix reste à droite, même quand la description est longue.
          <li key={item.sku} className="grid grid-cols-[1fr_auto] items-start gap-4 py-2">
            <div className="min-w-0">
              <p className="font-semibold">
                {item.quantity} × {item.name}
              </p>
              <p className="text-xs text-neutral-700">
                {CONDITION_LABELS[item.condition]}
                {Object.keys(item.options).length ? ` · ${formatOptions(item.options)}` : ""}
                {warrantyLabel(item.warrantyMonths) ? ` · ${warrantyLabel(item.warrantyMonths)}` : ""}
              </p>
            </div>
            <p className="text-right font-semibold tabular-nums whitespace-nowrap">{item.isGift ? "Offert" : formatPrice(item.unitPrice * item.quantity)}</p>
          </li>
        ))}
      </ul>

      <div className="space-y-1 border-t border-neutral-400 pt-3">
        {order.type === "delivery" ? (
          <p className="grid grid-cols-[1fr_auto] gap-4">
            <span>Livraison</span>
            <span className="text-right tabular-nums">{order.shippingFee === 0 ? "Offerte" : formatPrice(order.shippingFee)}</span>
          </p>
        ) : null}
        <p className="grid grid-cols-[1fr_auto] gap-4 text-base font-extrabold">
          <span>Total</span>
          <span className="text-right tabular-nums whitespace-nowrap">{formatPrice(order.total)}</span>
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

export default function OrderSlip({ order, captureRef }: { order: OrderDetail; captureRef?: Ref<HTMLElement> }) {
  return (
    <>
      <div className="no-print">
        <Slip order={order} innerRef={captureRef} />
      </div>
      <PrintCopy>
        <Slip order={order} />
      </PrintCopy>
    </>
  );
}
