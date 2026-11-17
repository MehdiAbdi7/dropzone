"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useChangeStatusMutation, useReceiveAdvanceMutation, useShareBaridiNumberMutation, type AdminOrder } from "@/features/admin/api/ordersApi";
import CollectDelivery from "@/features/admin/deliveries/CollectDelivery";
import ReturnDelivery from "@/features/admin/deliveries/ReturnDelivery";
import { errorMessage } from "@/lib/errors";
import { formatPrice } from "@/lib/format";
import NegotiatePrices from "./NegotiatePrices";
import ValidatePickup from "./ValidatePickup";
import { negotiationState } from "./negotiation";
import { unlimitedStage, unlimitedStageLabel } from "./reservationStage";

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
  // Les prix négociés, saisis par ligne : envoyés avec « Confirmer » ou « Valider la réservation ».
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

      {pickup && order.status === "reserved" && order.reservationMode === "unlimited" ? <BaridiActions order={order} /> : null}

      {pickup && order.status === "reserved" ? (
        <ValidatePickup
          orderId={order.id}
          negotiation={negotiation}
          items={order.items}
          prices={prices}
          onPrice={setPrice}
          shippingFee={order.shippingFee}
          alreadyPaid={order.advancePaidAt ? (order.advanceAmount ?? 0) : 0}
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

// La réservation illimitée avec avance BaridiMob (18/11), côté magasin. 1) On appelle le client ; « Envoyer le
// numéro BaridiMob » le rend visible dans son suivi. 2) Quand le virement est arrivé, « Avance reçue » écrit
// l'avance dans l'argent du jour (BaridiMob) et la réservation passe « en cours ». 3) Au retrait, « Valider la
// réservation » n'encaisse que le reste.
function BaridiActions({ order }: { order: AdminOrder }) {
  const [share, shareState] = useShareBaridiNumberMutation();
  const [receive, receiveState] = useReceiveAdvanceMutation();
  const stage = unlimitedStage(order) ?? "call";
  const error = shareState.error ?? receiveState.error;
  const advance = formatPrice(order.advanceAmount ?? 0);

  return (
    <section aria-label="Avance BaridiMob" className="space-y-3 rounded-lg border border-line bg-surface-2 p-4">
      <p className="font-display font-bold">
        Réservation illimitée · avance {advance} · <span className={stage === "confirmed" ? "text-blue-ink" : "text-red"}>{unlimitedStageLabel(stage)}</span>
      </p>
      {stage === "call" ? (
        <>
          <p className="text-sm text-ink-muted">
            Appelez le client pour confirmer, puis envoyez-lui le numéro BaridiMob : il le verra dans le suivi de sa commande.
          </p>
          <button type="button" className="btn btn-primary" disabled={shareState.isLoading} onClick={() => share(order.id)}>
            Envoyer le numéro BaridiMob
          </button>
        </>
      ) : null}
      {stage === "advance" ? (
        <>
          <p className="text-sm text-ink-muted">
            Numéro envoyé au client ({order.baridiNumber}). Quand le virement de {advance} est arrivé, confirmez-le : il entre dans
            l&apos;argent du jour en BaridiMob.
          </p>
          <ConfirmDialog
            trigger="Avance reçue"
            title={`Avance reçue pour la commande n° ${order.number} ?`}
            confirmLabel="Oui, l'avance est reçue"
            onConfirm={() => receive(order.id)}
          >
            {advance} sont écrits dans l&apos;argent d&apos;aujourd&apos;hui (BaridiMob) et la réservation est confirmée. Ce clic ne se
            défait pas.
          </ConfirmDialog>
        </>
      ) : null}
      {stage === "confirmed" ? (
        <p className="text-sm text-ink-muted">
          Avance reçue : la réservation est confirmée. Le client ne paiera que {formatPrice(order.total - (order.advanceAmount ?? 0))} à son
          passage.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
    </section>
  );
}
