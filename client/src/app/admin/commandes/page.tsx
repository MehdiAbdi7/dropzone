"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { STATUS_LABELS } from "@/config/catalog";
import { useAdminOrdersQuery } from "@/features/admin/api/ordersApi";
import { ordersHref } from "@/features/admin/navConfig";
import { dailyLabel, receptionLabel } from "@/features/admin/orders/orderLabels";
import { formatDate, formatPrice } from "@/lib/format";
import type { OrderStatus, OrderType } from "@/types/api";

// Les onglets Retraits et Magasin de la section Commandes (14/11). Les livraisons ont leur page
// (/admin/livraisons). Les états proposés suivent l'onglet : un retrait n'a que quatre états, une vente
// au magasin un seul (donc aucun filtre d'état).
const PICKUP_STATUSES: OrderStatus[] = ["reserved", "picked_up", "expired", "cancelled"];
const TITLES: Partial<Record<OrderType, string>> = { pickup: "Retraits au magasin", in_store: "Ventes au magasin" };

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
  // Seuls Retraits et Magasin passent par cette page ; les livraisons ont la leur.
  const type: OrderType | undefined = rawType === "pickup" || rawType === "in_store" ? rawType : undefined;
  const status = type === "pickup" ? ((params.get("status") as OrderStatus | null) ?? undefined) : undefined;
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const { data, isFetching } = useAdminOrdersQuery({ status, type, q: q || undefined, page }, { pollingInterval: 30_000, skip: !type });

  // Un ancien lien (`/admin/commandes?status=pending`, un type de livraison, ou rien) mène à l'onglet
  // où l'on gère cet état : Livraisons la plupart du temps.
  useEffect(() => {
    if (!type) router.replace(ordersHref(params.get("status") ?? undefined));
  }, [type, params, router]);

  // Le filtre d'état vit dans l'adresse : un lien du tableau de bord ouvre le bon état.
  const go = (next?: OrderStatus) => {
    setPage(1);
    router.push(`/admin/commandes?type=pickup${next ? `&status=${next}` : ""}`);
  };

  if (!type) return <p className="text-ink-muted">Chargement…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">{TITLES[type]}</h1>
      {type === "pickup" ? (
        <div role="group" aria-label="État du retrait" className="flex flex-wrap gap-2">
          {[undefined, ...PICKUP_STATUSES].map((value) => (
            <button key={value ?? "all"} type="button" className="chip" aria-pressed={status === value} onClick={() => go(value)}>
              {value ? STATUS_LABELS[value] : "Tous les états"}
            </button>
          ))}
        </div>
      ) : null}
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

      {/* Sur téléphone, une carte par commande, comme une application (05/11) ; le tableau
          revient à partir de 768 px. */}
      <ul className="space-y-2 md:hidden" aria-busy={isFetching}>
        {data?.data.map((order) => (
          <li key={order.id}>
            <Link href={`/admin/commandes/${order.id}`} className="card flex items-center gap-3 p-3">
              <span className="min-w-0 flex-1">
                <span className="font-display font-bold text-blue-ink">{dailyLabel(order.dailyNumber, order.businessDate)}</span>
                <span className="block truncate text-sm font-semibold">{order.fullName}</span>
                <span className="block text-xs text-ink-muted">{receptionLabel(order)}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-bold">{formatPrice(order.total)}</span>
                <span className={`text-xs ${order.status === "pending" ? "font-semibold text-red" : "text-ink-muted"}`}>
                  {STATUS_LABELS[order.status]}
                </span>
              </span>
            </Link>
          </li>
        ))}
        {data && data.data.length === 0 ? <li className="card p-6 text-ink-muted">Aucune commande.</li> : null}
      </ul>

      <div className="card hidden overflow-x-auto md:block" aria-busy={isFetching}>
        <table className="table min-w-[760px]">
          <thead>
            <tr>
              <th scope="col">N° du jour</th>
              <th scope="col">Client</th>
              <th scope="col">Réception</th>
              <th scope="col">Passée le</th>
              <th scope="col">Statut</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((order) => (
              <tr key={order.id}>
                <td>
                  <Link href={`/admin/commandes/${order.id}`} className="font-display font-bold text-blue-ink underline">
                    {dailyLabel(order.dailyNumber, order.businessDate)}
                  </Link>
                  <br />
                  <span className="text-xs text-ink-muted">suivi {order.number}</span>
                </td>
                <td>
                  {order.fullName}
                  <br />
                  <span className="text-ink-muted">{order.phone}</span>
                </td>
                <td>{receptionLabel(order)}</td>
                <td>{formatDate(order.createdAt)}</td>
                <td>
                  <span className={order.status === "pending" ? "font-semibold text-red" : ""}>{STATUS_LABELS[order.status]}</span>
                </td>
                <td>{formatPrice(order.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && data.data.length === 0 ? <p className="p-6 text-ink-muted">Aucune commande.</p> : null}
      </div>

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
    </div>
  );
}
