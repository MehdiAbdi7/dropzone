"use client";

import Link from "next/link";
import { useState } from "react";
import { PAYMENT_METHOD_LABELS } from "@/config/catalog";
import { useValidatePickupMutation } from "@/features/admin/api/ordersApi";
import { errorMessage } from "@/lib/errors";
import { formatPrice } from "@/lib/format";
import type { PaymentMethod } from "@/types/api";
import NegotiatePrices from "./NegotiatePrices";
import { negotiationState, type NegotiableItem } from "./negotiation";

const METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

// Le client est venu : il paie, et le paiement entre dans la caisse du jour.
// Espèces par défaut : c'est le cas le plus courant au comptoir.
// Avant d'encaisser, le prix de chaque article peut se négocier : le nouveau total est celui qui
// entre dans la caisse.
export default function ValidatePickup({
  orderId,
  negotiation,
  items,
  prices,
  onPrice,
  shippingFee,
  alreadyPaid = 0,
}: {
  orderId: number;
  negotiation: ReturnType<typeof negotiationState>;
  items: NegotiableItem[];
  prices: Record<number, number>;
  onPrice: (id: number, value: number) => void;
  shippingFee: number;
  // L'avance BaridiMob déjà reçue (18/11) : le client ne paie que le reste.
  alreadyPaid?: number;
}) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [validate, { isLoading, error }] = useValidatePickupMutation();
  return (
    <div className="space-y-3">
      <p className="font-semibold">Le client est venu ?</p>
      {alreadyPaid > 0 ? (
        <p className="text-sm text-ink-muted">Avance BaridiMob déjà reçue : {formatPrice(alreadyPaid)}. Le client paie seulement le reste.</p>
      ) : null}
      <NegotiatePrices items={items} prices={prices} onPrice={onPrice} shippingFee={shippingFee} />
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
        <button
          type="button"
          className="btn btn-primary"
          disabled={isLoading || negotiation.problem !== null}
          onClick={() => validate({ id: orderId, method, prices: negotiation.toSend })}
        >
          Valider la réservation · {alreadyPaid > 0 ? "reste " : ""}{Number.isNaN(negotiation.total) ? "—" : formatPrice(negotiation.total - alreadyPaid)}
        </button>
      </div>
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
          {errorMessage(error).includes("journée de caisse") ? (
            <>
              {" "}
              <Link href="/admin/caisse" className="underline">
                Ouvrir la caisse
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
