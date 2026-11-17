"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { STORE_INFO } from "@/config/storeInfo";
import OrderSlipSection from "@/features/orders/OrderSlipSection";
import { useTrackOrderMutation, type PlacedOrder } from "@/features/orders/ordersApi";
import { formatPrice } from "@/lib/format";
import { pickupLabel } from "@/lib/pickupLabel";

// La dernière commande, gardée dans sessionStorage par le formulaire. Lue avec
// useSyncExternalStore : rien côté serveur, la valeur réelle côté navigateur.
function readLastOrder(): string | null {
  try {
    return sessionStorage.getItem("dropzone-last-order");
  } catch {
    return null;
  }
}

export default function ConfirmationView({ number }: { number: string | undefined }) {
  const raw = useSyncExternalStore(
    () => () => {},
    readLastOrder,
    () => null,
  );
  const last = raw ? (JSON.parse(raw) as Partial<PlacedOrder>) : null;
  const mine = last && String(last.number) === number ? last : null;
  // Un réservation au magasin (14/11) : le créneau et le paiement au magasin.
  const pickup = mine?.type === "pickup" && ((mine.pickupDate && mine.pickupTime) || mine.reservationMode === "unlimited") ? mine : null;
  const unlimited = pickup?.reservationMode === "unlimited";

  // Le bon de commande (lot 6) : le détail de la commande, relu avec son numéro et le téléphone gardés avec
  // elle (comme le fait la page « Suivi »). Sans eux (page ouverte autrement), pas de bon.
  const [track, { data: detail }] = useTrackOrderMutation();
  const orderNumber = mine?.number;
  const orderPhone = mine?.phone;
  useEffect(() => {
    if (orderNumber && orderPhone) void track({ number: orderNumber, phone: orderPhone });
  }, [orderNumber, orderPhone, track]);

  return (
    <div className="card max-w-2xl space-y-5 p-6 sm:p-8">
      <p className="font-display text-sm font-bold text-blue-ink">{pickup ? "Appareil réservé" : "Commande enregistrée"}</p>
      <h1 className="text-3xl">Merci, votre commande n° {number ?? "?"} est reçue.</h1>
      {pickup ? (
        <>
          {unlimited ? (
            <div className="space-y-2">
              <p>
                <strong>Réservation illimitée</strong> : votre appareil est gardé pour vous, sans date limite.
              </p>
              <p>
                Le magasin vous appelle pour confirmer. Vous recevrez ensuite le <strong>numéro BaridiMob</strong> sur la page{" "}
                <Link href={`/suivi?numero=${number ?? ""}`} className="text-blue-ink underline">
                  Suivi
                </Link>{" "}
                de votre commande, pour envoyer l&apos;avance de{" "}
                <strong className="font-display text-xl">{formatPrice(pickup.advanceAmount ?? 0)}</strong>. Votre réservation est
                confirmée dès que le magasin la reçoit.
              </p>
            </div>
          ) : (
            <p>
              Réservation au magasin <strong>{pickupLabel(pickup.pickupDate!, pickup.pickupTime!)}</strong>. Votre appareil est réservé
              jusqu&apos;à minuit ce jour-là.
            </p>
          )}
          {mine?.total !== undefined ? (
            <p>
              Montant à payer au magasin{unlimited ? " (avance déduite)" : ""} : <strong className="font-display text-xl">{formatPrice(mine.total)}</strong>
            </p>
          ) : null}
        </>
      ) : (
        <>
          {mine?.total !== undefined ? (
            <p>
              Montant à payer à la livraison : <strong className="font-display text-xl">{formatPrice(mine.total)}</strong>
            </p>
          ) : null}
          <p className="text-ink-muted">{STORE_INFO.confirmation}</p>
        </>
      )}
      <p className="text-ink-muted">Gardez ce numéro : avec votre téléphone, il permet de suivre la commande.</p>
      {/* Le bon (lot 6) : à retélécharger aussi depuis la page « Suivi ». */}
      {detail ? <OrderSlipSection order={detail} /> : null}
      <div className="no-print flex flex-wrap gap-3">
        <Link href={`/suivi?numero=${number ?? ""}`} className="btn btn-primary">
          Suivre ma commande
        </Link>
        <Link href="/boutique" className="btn btn-secondary">
          Continuer mes achats
        </Link>
      </div>
    </div>
  );
}
