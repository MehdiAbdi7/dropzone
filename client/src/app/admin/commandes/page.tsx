"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { STATUS_LABELS } from "@/config/catalog";
import { useAdminOrdersQuery } from "@/features/admin/api/ordersApi";
import { formatDate, formatPrice } from "@/lib/format";
import type { OrderStatus } from "@/types/api";

const STATUSES = Object.keys(STATUS_LABELS) as OrderStatus[];

export default function AdminOrdersPage() {
  return (
    <Suspense>
      <OrdersList />
    </Suspense>
  );
}

function OrdersList() {
  const router = useRouter();
  const status = (useSearchParams().get("status") as OrderStatus | null) ?? undefined;
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const { data, isFetching } = useAdminOrdersQuery({ status, q: q || undefined, page }, { pollingInterval: 30_000 });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Commandes</h1>
      <div className="flex flex-wrap gap-2">
        {[undefined, ...STATUSES].map((value) => (
          <button
            key={value ?? "all"}
            type="button"
            className="chip"
            aria-pressed={status === value}
            onClick={() => {
              setPage(1);
              router.push(value ? `/admin/commandes?status=${value}` : "/admin/commandes");
            }}
          >
            {value ? STATUS_LABELS[value] : "Toutes"}
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
                <span className="font-display font-bold text-blue-ink">N° {order.number}</span>
                <span className="block truncate text-sm font-semibold">{order.fullName}</span>
                <span className="block text-xs text-ink-muted">
                  {order.wilaya} · {formatDate(order.createdAt)}
                </span>
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
        <table className="table min-w-[720px]">
          <thead>
            <tr>
              <th scope="col">N°</th>
              <th scope="col">Client</th>
              <th scope="col">Wilaya</th>
              <th scope="col">Date</th>
              <th scope="col">Statut</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((order) => (
              <tr key={order.id}>
                <td>
                  <Link href={`/admin/commandes/${order.id}`} className="font-display font-bold text-blue-ink underline">
                    {order.number}
                  </Link>
                </td>
                <td>
                  {order.fullName}
                  <br />
                  <span className="text-ink-muted">{order.phone}</span>
                </td>
                <td>{order.wilaya}</td>
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
