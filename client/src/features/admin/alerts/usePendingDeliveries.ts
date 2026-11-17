"use client";

import { canAccess } from "@/features/admin/access";
import { useAdminOrdersQuery, type AdminOrderRow } from "@/features/admin/api/ordersApi";
import { useAdminRole } from "@/features/admin/AdminRoleContext";

// Même cadence que la page Livraisons : un filet de sécurité, la liste se relit toute seule.
const POLL_INTERVAL_MS = 20_000;

// Référence stable : un `?? []` créerait un nouveau tableau à chaque rendu.
const NO_ORDERS: AdminOrderRow[] = [];

// Une livraison « À confirmer » (statut pending) : le client a commandé sur le site, le magasin doit
// l'appeler. C'est la seule commande qui attend vraiment une action, donc c'est elle que compte la pastille
// du menu et que l'alerte répète jusqu'à ce qu'elle soit vue.
// Partagé par la barre latérale, la barre du bas, les sous-onglets et l'alerte : mêmes arguments, donc
// RTK Query n'envoie qu'une seule requête pour tous.
// Un vendeur n'a pas la page Commandes (lot 7) : on ne lit rien pour lui, l'API refuserait (403) à chaque tour.
export function usePendingDeliveries() {
  const skip = !canAccess(useAdminRole(), "/admin/livraisons");
  const { data, isSuccess } = useAdminOrdersQuery(
    { type: "delivery", status: "pending", page: 1 },
    { pollingInterval: POLL_INTERVAL_MS, skip },
  );
  return { orders: data?.data ?? NO_ORDERS, count: data?.pagination.total ?? 0, isSuccess };
}

// Les retraits réservés (nouveaux ou non) : sert seulement à repérer une réservation qui vient d'arriver.
export function useReservedPickups() {
  const skip = !canAccess(useAdminRole(), "/admin/commandes");
  const { data, isSuccess } = useAdminOrdersQuery(
    { type: "pickup", status: "reserved", page: 1 },
    { pollingInterval: POLL_INTERVAL_MS, skip },
  );
  return { orders: data?.data ?? NO_ORDERS, isSuccess };
}

