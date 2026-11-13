"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { STATUS_LABELS } from "@/config/catalog";
import { useAdminOrdersQuery } from "@/features/admin/api/ordersApi";
import { dailyLabel, receptionLabel } from "@/features/admin/orders/orderLabels";
import { formatDate, formatPrice } from "@/lib/format";
import type { OrderStatus, OrderType } from "@/types/api";

const STATUSES = Object.keys(STATUS_LABELS) as OrderStatus[];
// Les onglets par type (14/11) : livraisons, retraits, ventes au magasin.
const TYPES: (OrderType | undefined)[] = [undefined, "delivery", "pickup", "in_store"];
const TYPE_TABS: Record<OrderType, string> = { delivery: "Livraisons", pickup: "Retraits", in_store: "Magasin" };

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
  const status = (params.get("status") as OrderStatus | null) ?? undefined;
  const type = (params.get("type") as OrderType | null) ?? undefined;
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const { data, isFetching } = useAdminOrdersQuery({ status, type, q: q || undefined, page }, { pollingInterval: 30_000 });

  // Les deux filtres vivent dans l'adresse : un lien du tableau de bord ouvre le bon onglet.
  const go = (next: { status?: OrderStatus; type?: OrderType }) => {
    setPage(1);
    const search = new URLSearchParams();
    if (next.type) search.set("type", next.type);
    if (next.status) search.set("status", next.status);
    router.push(`/admin/commandes${search.size ? `?${search}` : ""}`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Commandes</h1>
      <div role="tablist" aria-label="Type de commande" className="flex flex-wrap gap-2 border-b border-line pb-3">
        {TYPES.map((value) => (
          <button
            key={value ?? "all"}
            type="button"
            role="tab"
            aria-selected={type === value}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              type === value ? "bg-blue text-on-brand" : "bg-surface-2 text-ink hover:text-blue-ink"
            }`}
            onClick={() => go({ type: value, status })}
          >
            {value ? TYPE_TABS[value] : "Toutes"}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {[undefined, ...STATUSES].map((value) => (
          <button
            key={value ?? "all"}
            type="button"
            className="chip"
            aria-pressed={status === value}
            onClick={() => go({ type, status: value })}
          >
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
