"use client";

import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { AlertIcon } from "@/components/ui/icons";
import { dailyLabel } from "@/features/admin/orders/orderLabels";
import {
  isAudioBlocked,
  playNewOrderChime,
  playReservationChime,
  subscribeAudioState,
  unlockAudio,
} from "@/lib/orderAlertSound";
import { acknowledge, keepOnly, useAcknowledged } from "./acknowledged";
import { newArrivals, pruneAcknowledged, shouldRingNow, unseenIds } from "./alertLogic";
import { usePendingDeliveries, useReservedPickups } from "./usePendingDeliveries";

// Un rappel tant qu'une commande n'a pas été vue : assez espacé pour ne pas couvrir le comptoir, assez
// proche pour qu'une commande ne dorme pas.
const REPEAT_INTERVAL_MS = 30_000;

// Les gestes qui comptent comme une « interaction » pour le navigateur : seul un geste débloque le son.
// touchend en plus de click, car sur tablette un toucher ne déclenche pas toujours de clic.
const UNLOCK_EVENTS = ["click", "touchend", "keydown"] as const;

// L'alerte des nouvelles commandes (17/11), montée UNE fois dans le layout du back-office : elle sonne
// et s'affiche sur toutes les pages, comme sur Niwa Food. Deux sortes :
//  - une livraison « À confirmer » (le client attend un appel) : deux notes, répétées toutes les 30 s
//    jusqu'à ce qu'on la marque « Vu » ou qu'on ouvre la commande ;
//  - une réservation de retrait qui vient d'arriver : une seule note douce, une fois, sans rappel.
export default function NewOrderAlert() {
  const acknowledged = useAcknowledged();
  const deliveries = usePendingDeliveries();
  const reservations = useReservedPickups();
  // L'état du son vit dans l'AudioContext, hors de React. Côté serveur, il n'y a pas de son.
  const audioBlocked = useSyncExternalStore(subscribeAudioState, isAudioBlocked, () => false);

  const pendingIds = deliveries.orders.map((order) => order.id);
  const unseenDeliveries = deliveries.orders.filter((order) => unseenIds([order.id], acknowledged).length > 0);
  // Des chaînes plutôt que des tableaux dans les dépendances des effets : un nouveau tableau à chaque
  // rendu relancerait l'effet, donc le minuteur de 30 s, en permanence.
  const pendingKey = pendingIds.join(",");
  const unseenKey = unseenDeliveries.map((order) => order.id).join(",");
  const reservedKey = reservations.orders.map((order) => order.id).join(",");

  // Le navigateur n'ouvre le son que pendant un geste : on écoute les gestes, n'importe où. Toujours
  // actif, car sur iPhone l'état peut être « running » alors que la sortie n'est pas encore ouverte.
  useEffect(() => {
    UNLOCK_EVENTS.forEach((type) => window.addEventListener(type, unlockAudio, { passive: true }));
    return () => UNLOCK_EVENTS.forEach((type) => window.removeEventListener(type, unlockAudio));
  }, []);

  // Oublie les « Vu » des commandes sorties de l'attente (confirmées, annulées, récupérées…) : elles n'y
  // reviendront pas, et la liste ne doit pas grossir sans fin.
  useEffect(() => {
    if (!deliveries.isSuccess || !reservations.isSuccess) return;
    const live = [...(pendingKey ? pendingKey.split(",") : []), ...(reservedKey ? reservedKey.split(",") : [])].map(Number);
    keepOnly(pruneAcknowledged(acknowledged, live));
  }, [deliveries.isSuccess, reservations.isSuccess, pendingKey, reservedKey, acknowledged]);

  // Ce que l'effet précédent a vu : distingue une VRAIE nouvelle commande (sonner tout de suite) d'un
  // simple nouveau rendu.
  const lastRun = useRef<{ ids: Set<number>; audioBlocked: boolean } | null>(null);
  useEffect(() => {
    // Rien avant d'avoir reçu la liste : sinon une page sans données sonnerait à tort.
    if (!deliveries.isSuccess) return;
    const ids = unseenKey ? unseenKey.split(",").map(Number) : [];
    const previous = lastRun.current;
    lastRun.current = { ids: new Set(ids), audioBlocked };
    if (ids.length === 0) return;

    if (shouldRingNow({ previous: previous?.ids ?? null, unseen: ids, wasBlocked: previous?.audioBlocked ?? false, blocked: audioBlocked })) {
      playNewOrderChime();
    }
    const timer = window.setInterval(playNewOrderChime, REPEAT_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [deliveries.isSuccess, unseenKey, audioBlocked]);

  // Les réservations : une note à chaque arrivée, jamais au premier chargement. Ce qui existait déjà à
  // l'ouverture de la page est marqué « Vu » d'office : seules les suivantes sont nouvelles.
  const reservedSeen = useRef<Set<number> | null>(null);
  useEffect(() => {
    if (!reservations.isSuccess) return;
    const ids = reservedKey ? reservedKey.split(",").map(Number) : [];
    const first = reservedSeen.current === null;
    const fresh = newArrivals(reservedSeen.current, ids);
    reservedSeen.current = new Set(ids);
    if (first) acknowledge(ids);
    else if (fresh.length > 0) playReservationChime();
  }, [reservations.isSuccess, reservedKey]);

  const newReservations = reservations.orders.filter((order) => !acknowledged.includes(order.id));

  if (!audioBlocked && unseenDeliveries.length === 0 && newReservations.length === 0) return null;

  const count = unseenDeliveries.length;
  return (
    // sticky top-[4.25rem] : dans le contenu, et collée juste sous la barre du haut (h-14) quand on défile.
    // Elle ne passe plus sous la barre, quel que soit le bandeau « démo » au-dessus. z-30 : au-dessus
    // du contenu, sous la barre du haut et les fenêtres.
    <div className="sticky top-[4.25rem] z-30 mb-6 flex max-w-2xl flex-col gap-2">
      {audioBlocked ? (
        <div role="status" className="card flex items-center gap-2.5 px-4 py-3 text-sm font-semibold shadow-lg">
          <AlertIcon size={20} className="shrink-0 text-red" />
          <p>Son bloqué par le navigateur : touchez l&apos;écran pour activer les alertes.</p>
        </div>
      ) : null}

      {count > 0 ? (
        <div role="alert" className="card flex items-center gap-3 border-2 border-blue px-4 py-3 shadow-lg">
          <AlertIcon size={24} className="shrink-0 text-blue-ink" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-bold">
              {count} nouvelle{count > 1 ? "s" : ""} commande{count > 1 ? "s" : ""} à confirmer
            </p>
            <p className="truncate text-xs text-ink-muted">
              {unseenDeliveries.map((order) => dailyLabel(order.dailyNumber, order.businessDate)).join(" · ")}
            </p>
          </div>
          <Link href="/admin/livraisons?status=pending" className="btn btn-secondary btn-small">
            Voir
          </Link>
          <button type="button" className="btn btn-primary btn-small" onClick={() => acknowledge(unseenDeliveries.map((order) => order.id))}>
            Vu
          </button>
        </div>
      ) : null}

      {newReservations.length > 0 ? (
        <div role="status" className="card flex items-center gap-3 px-4 py-3 shadow-lg">
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-bold">
              {newReservations.length} nouvelle{newReservations.length > 1 ? "s" : ""} réservation{newReservations.length > 1 ? "s" : ""}
            </p>
            <p className="truncate text-xs text-ink-muted">
              {newReservations.map((order) => `${order.fullName} · ${dailyLabel(order.dailyNumber, order.businessDate)}`).join(" · ")}
            </p>
          </div>
          <Link href="/admin/commandes?type=pickup&status=reserved" className="btn btn-secondary btn-small">
            Voir
          </Link>
          <button type="button" className="btn btn-primary btn-small" onClick={() => acknowledge(newReservations.map((order) => order.id))}>
            Vu
          </button>
        </div>
      ) : null}
    </div>
  );
}
