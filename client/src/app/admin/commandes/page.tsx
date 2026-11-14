"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAcknowledged } from "@/features/admin/alerts/acknowledged";
import { useAdminOrdersQuery } from "@/features/admin/api/ordersApi";
import { ordersHref } from "@/features/admin/navConfig";
import OrderWindow from "@/features/admin/orders/OrderWindow";
import OrdersTable from "@/features/admin/orders/OrdersTable";
import OrdersTabs, { type OrdersTab } from "@/features/admin/orders/OrdersTabs";
import { useOrderWindow } from "@/features/admin/orders/useOrderWindow";
import type { OrderType } from "@/types/api";

// L'onglet Retraits de la section Commandes. Les livraisons ont leur page (/admin/livraisons).
// Une vente au magasin n'a pas d'étapes : elle est encaissée sur place et se retrouve dans l'Historique
// (onglet Magasin), où l'admin peut la modifier ou l'annuler : elle n'a pas de liste ici.
// Comme les livraisons : seulement les retraits ACTIFS (réservés), en deux onglets. Un retrait n'a
// qu'un état avant d'être récupéré, donc « nouvelle » veut dire « pas encore vue » : le « Vu » de
// l'alerte (ou l'ouverture de la fenêtre) la fait passer dans « En cours ». Un retrait récupéré,
// annulé ou expiré se retrouve dans l'Historique. Un clic ouvre la fenêtre, placée sur son étape.
// Les réservations durent deux jours au plus : une page de 50 les contient toutes.
export default function AdminOrdersPage() {
  return (
    <Suspense>
      <OrdersList />
    </Suspense>
  );
}

function OrdersList() {
  const router = useRouter();
  const params = useSearchParams();
  const rawType = params.get("type");
  // Seuls les retraits passent par cette page ; les livraisons ont la leur, les ventes au magasin
  // l'Historique.
  const type: OrderType | undefined = rawType === "pickup" ? "pickup" : undefined;
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<OrdersTab>("new");
  const orderWindow = useOrderWindow();
  const acknowledged = useAcknowledged();
  const { data, isFetching } = useAdminOrdersQuery(
    { status: "reserved", type, q: q || undefined, page: 1, limit: 50 },
    { pollingInterval: 30_000, skip: !type },
  );

  // Un ancien lien (`/admin/commandes?status=pending`, un type de livraison ou de vente au magasin, ou
  // rien) mène à l'endroit où l'on gère cette commande.
  useEffect(() => {
    if (type) return;
    router.replace(rawType === "in_store" ? "/admin/historique?type=in_store" : ordersHref(params.get("status") ?? undefined));
  }, [type, rawType, params, router]);

  if (!type) return <p className="text-ink-muted">Chargement…</p>;

  const fresh = data?.data.filter((order) => !acknowledged.includes(order.id));
  const ongoing = data?.data.filter((order) => acknowledged.includes(order.id));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Retraits au magasin</h1>
      <OrdersTabs tab={tab} onChange={setTab} newCount={fresh?.length} ongoingCount={ongoing?.length} />
      <label className="block max-w-md">
        <span className="sr-only">Chercher une commande</span>
        <input
          className="input"
          type="search"
          placeholder="Numéro, téléphone ou nom…"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
      </label>

      <OrdersTable
        orders={tab === "new" ? fresh : ongoing}
        busy={isFetching}
        empty={tab === "new" ? "Aucune nouvelle réservation." : "Aucun retrait en cours."}
        onOpen={orderWindow.open}
      />

      <OrderWindow id={orderWindow.id} onClose={orderWindow.close} />
    </div>
  );
}
