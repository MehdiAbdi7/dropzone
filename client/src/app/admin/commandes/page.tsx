"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { STATUS_LABELS } from "@/config/catalog";
import { useAdminOrdersQuery } from "@/features/admin/api/ordersApi";
import { ordersHref } from "@/features/admin/navConfig";
import OrderWindow from "@/features/admin/orders/OrderWindow";
import OrdersTable from "@/features/admin/orders/OrdersTable";
import { useOrderWindow } from "@/features/admin/orders/useOrderWindow";
import type { OrderStatus, OrderType } from "@/types/api";

// L'onglet Retraits de la section Commandes. Les livraisons ont leur page (/admin/livraisons).
// Une vente au magasin n'a pas d'étapes : elle est encaissée sur place et se retrouve dans l'Historique
// (onglet Magasin), où l'admin peut la modifier ou l'annuler : elle n'a pas de liste ici.
// Un clic sur une commande ouvre sa fenêtre, placée sur l'étape où elle en est.
const PICKUP_STATUSES: OrderStatus[] = ["reserved", "picked_up", "expired", "cancelled"];

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
  const status = (params.get("status") as OrderStatus | null) ?? undefined;
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const orderWindow = useOrderWindow();
  const { data, isFetching } = useAdminOrdersQuery({ status, type, q: q || undefined, page }, { pollingInterval: 30_000, skip: !type });

  // Un ancien lien (`/admin/commandes?status=pending`, un type de livraison ou de vente au magasin, ou
  // rien) mène à l'endroit où l'on gère cette commande.
  useEffect(() => {
    if (type) return;
    router.replace(rawType === "in_store" ? "/admin/historique?type=in_store" : ordersHref(params.get("status") ?? undefined));
  }, [type, rawType, params, router]);

  // Le filtre d'état vit dans l'adresse : un lien du tableau de bord ouvre le bon état.
  const go = (next?: OrderStatus) => {
    setPage(1);
    router.push(`/admin/commandes?type=pickup${next ? `&status=${next}` : ""}`);
  };

  if (!type) return <p className="text-ink-muted">Chargement…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Retraits au magasin</h1>
      <div role="group" aria-label="État du retrait" className="flex flex-wrap gap-2">
        {[undefined, ...PICKUP_STATUSES].map((value) => (
          <button key={value ?? "all"} type="button" className="chip" aria-pressed={status === value} onClick={() => go(value)}>
            {value ? STATUS_LABELS[value] : "Tous les états"}
          </button>
        ))}
      </div>
      <label className="block max-w-md">
        <span className="sr-only">Chercher une commande</span>
        <input
          className="input"
          type="search"
          placeholder="Numéro, téléphone ou nom…"
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setPage(1);
          }}
        />
      </label>

      <OrdersTable orders={data?.data} busy={isFetching} empty="Aucune commande." onOpen={orderWindow.open} />

      {data && data.pagination.pages > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <button type="button" className="btn btn-secondary btn-small" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Précédente
          </button>
          <p className="text-sm">
            Page {data.pagination.page} sur {data.pagination.pages}
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-small"
            disabled={page >= data.pagination.pages}
            onClick={() => setPage(page + 1)}
          >
            Suivante
          </button>
        </div>
      ) : null}

      <OrderWindow id={orderWindow.id} onClose={orderWindow.close} />
    </div>
  );
}
