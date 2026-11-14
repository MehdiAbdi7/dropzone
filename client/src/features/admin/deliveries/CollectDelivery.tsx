"use client";

import { useState } from "react";
import { PAYMENT_METHOD_LABELS } from "@/config/catalog";
import { useCollectDeliveryMutation } from "@/features/admin/api/ordersApi";
import { errorMessage } from "@/lib/errors";
import { formatPrice } from "@/lib/format";
import type { PaymentMethod } from "@/types/api";

const METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

// Encaisser une livraison livrée : l'argent est arrivé (le livreur ou la société de livraison l'a
// reversé). On choisit par quel moyen. L'argent compte le jour où l'on clique, et il n'entre
// jamais dans la caisse du magasin. CCP par défaut : c'est le cas le plus courant pour une société
// de livraison.
export default function CollectDelivery({ orderId, total, compact = false }: { orderId: number; total: number; compact?: boolean }) {
  const [method, setMethod] = useState<PaymentMethod>("ccp");
  const [collect, { isLoading, error }] = useCollectDeliveryMutation();
  return (
    <div className={compact ? "space-y-2" : "card space-y-3 border-blue-ink p-5"}>
      {compact ? null : (
        <>
          <h2 className="text-lg">L&apos;argent de cette livraison est arrivé ?</h2>
          <p className="text-sm text-ink-muted">
            Il sera compté dans l&apos;historique à la date d&apos;aujourd&apos;hui, dans l&apos;onglet Livraisons, jamais dans la caisse du magasin.
          </p>
        </>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm font-semibold">
          <span className="block">Moyen de paiement</span>
          <select className="input" value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
            {METHODS.map((value) => (
              <option key={value} value={value}>
                {PAYMENT_METHOD_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-primary" disabled={isLoading} onClick={() => collect({ id: orderId, method })}>
          Encaisser · {formatPrice(total)}
        </button>
      </div>
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
    </div>
  );
}
