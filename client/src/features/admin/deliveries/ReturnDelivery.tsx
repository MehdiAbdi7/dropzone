"use client";

import { useState } from "react";
import { PAYMENT_METHOD_LABELS } from "@/config/catalog";
import { useReturnDeliveryMutation } from "@/features/admin/api/ordersApi";
import { errorMessage } from "@/lib/errors";
import type { PaymentMethod } from "@/types/api";

const METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

// Un colis qui revient : le client l'a refusé ou n'a pas répondu à la société de livraison. Le produit
// revient en stock et se remet en vente tout seul. DropZone paie le retour : le montant dépend de la
// wilaya et de la société, donc on le saisit à chaque fois (0 si rien n'est facturé). Il se retranche
// de l'argent des livraisons et du bénéfice, dans l'historique, hors caisse du magasin.
export default function ReturnDelivery({ orderId, number }: { orderId: number; number: number }) {
  const [open, setOpen] = useState(false);
  const [fee, setFee] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("ccp");
  const [giveBack, { isLoading, error }] = useReturnDeliveryMutation();
  const amount = fee.trim() === "" ? Number.NaN : Number(fee);
  const valid = Number.isInteger(amount) && amount >= 0;

  if (!open) {
    return (
      <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>
        Colis retourné
      </button>
    );
  }
  return (
    <form
      className="card w-full space-y-3 border-red p-4"
      aria-label={`Retour de la commande n° ${number}`}
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) giveBack({ id: orderId, fee: amount, method });
      }}
    >
      <p className="text-sm">
        Le client a refusé le colis ou n&apos;a pas répondu à la société : le produit revient en stock et se remet en vente. Indiquez
        ce que <strong>DropZone paie</strong> pour ce retour (0 si rien).
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm font-semibold">
          <span className="block">Frais de retour (DA)</span>
          <input
            className="input"
            inputMode="numeric"
            value={fee}
            onChange={(event) => setFee(event.target.value.replace(/\D/g, ""))}
          />
        </label>
        <label className="space-y-1 text-sm font-semibold">
          <span className="block">Payés par</span>
          <select className="input" value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
            {METHODS.map((value) => (
              <option key={value} value={value}>
                {PAYMENT_METHOD_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={isLoading || !valid}>
          Confirmer le retour
        </button>
        <button type="button" className="btn" disabled={isLoading} onClick={() => setOpen(false)}>
          Annuler
        </button>
      </div>
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
    </form>
  );
}
