"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useChangeStatusMutation, type AdminOrder } from "@/features/admin/api/ordersApi";
import CollectDelivery from "@/features/admin/deliveries/CollectDelivery";
import ReturnDelivery from "@/features/admin/deliveries/ReturnDelivery";
import { errorMessage } from "@/lib/errors";
import NegotiatePrices from "./NegotiatePrices";
import ValidatePickup from "./ValidatePickup";
import { negotiationState } from "./negotiation";

// Ce que le bouton d'une étape fait passer à l'état suivant. Les boutons ne proposent que les
// transitions autorisées, renvoyées par l'API (`allowedTransitions`).
const FORWARD_LABELS = {
  confirmed: "Confirmer (client appelé)",
  shipped: "Marquer expédiée",
  delivered: "Marquer livrée",
} as const;

// Les actions de l'étape où en est la commande, et seulement elles : chaque étape porte ses boutons.
// « Encaissée », « Récupérée » et « Retournée » ont leur propre bloc : l'une écrit l'argent (moyen de
// paiement), l'autre remet le stock et demande confirmation.
export default function StepActions({ order }: { order: AdminOrder }) {
  const [changeStatus, { isLoading, error }] = useChangeStatusMutation();
  // Les prix négociés, saisis par ligne : envoyés avec « Confirmer » ou « Valider le retrait ».
  const [prices, setPrices] = useState<Record<number, number>>({});
  const allowed = order.allowedTransitions;
  const forward = allowed.filter((status): status is keyof typeof FORWARD_LABELS => status in FORWARD_LABELS);
  const canCancel = allowed.includes("cancelled");
  const canReturn = allowed.includes("returned");
  const pickup = order.type === "pickup";
  // On ne négocie que le prix d'une commande dont l'argent n'est pas encore entré ; une commande
  // payée se corrige par « Modifier ».
  const canNegotiate =
    ["pending", "confirmed", "reserved"].includes(order.status) && !order.payments.some((payment) => payment.kind !== "correction");
  const negotiation = negotiationState(order.items, canNegotiate ? prices : {}, order.shippingFee);
  const setPrice = (itemId: number, value: number) => setPrices((current) => ({ ...current, [itemId]: value }));

  return (
    <div className="space-y-4">
      {order.status === "delivered" ? <CollectDelivery orderId={order.id} total={order.total} /> : null}

      {pickup && order.status === "reserved" ? (
        <ValidatePickup
          orderId={order.id}
          negotiation={negotiation}
          items={order.items}
          prices={prices}
          onPrice={setPrice}
          shippingFee={order.shippingFee}
        />
      ) : null}

      {forward.length > 0 ? (
        <div className="space-y-3">
          {/* La confirmation d'une livraison est le moment de négocier le prix. */}
          {canNegotiate && forward.includes("confirmed") ? (
            <NegotiatePrices items={order.items} prices={prices} onPrice={setPrice} shippingFee={order.shippingFee} />
          ) : null}
          <div className="flex flex-wrap gap-3">
            {forward.map((status) => (
              <button
                key={status}
                type="button"
                className="btn btn-primary"
                disabled={isLoading || (status === "confirmed" && negotiation.problem !== null)}
                onClick={() => changeStatus({ id: order.id, status, ...(status === "confirmed" ? { prices: negotiation.toSend } : {}) })}
              >
                {FORWARD_LABELS[status]}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {canReturn || canCancel ? (
        <div className="flex flex-wrap gap-3 border-t border-line pt-4">
          {canReturn ? <ReturnDelivery orderId={order.id} number={order.number} /> : null}
          {canCancel ? (
            <ConfirmDialog
              trigger={pickup ? "Annuler la réservation" : "Annuler la commande"}
              title={`Annuler la commande n° ${order.number} ?`}
              confirmLabel="Annuler la commande"
              onConfirm={() => changeStatus({ id: order.id, status: "cancelled" })}
            >
              Le stock de chaque article, cadeaux compris, est rendu. Une commande annulée ne peut plus changer.
            </ConfirmDialog>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
    </div>
  );
}
