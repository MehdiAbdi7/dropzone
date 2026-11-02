"use client";

import Link from "next/link";
import { STATUS_LABELS } from "@/config/catalog";
import { useStatsQuery } from "@/features/admin/adminApi";
import { formatPrice } from "@/lib/format";
import type { OrderStatus } from "@/types/api";

const STATUSES: OrderStatus[] = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

export default function DashboardPage() {
  const { data: stats, isError } = useStatsQuery(undefined, { pollingInterval: 60_000 });

  if (isError) {
    return <p role="alert">Le tableau de bord ne répond pas.</p>;
  }
  if (!stats) {
    return <p className="text-ink-muted">Chargement…</p>;
  }

  const pending = stats.ordersByStatus.pending ?? 0;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl">Tableau de bord</h1>

      {pending > 0 ? (
        <Link
          href="/admin/commandes?status=pending"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red bg-red-soft p-4 font-semibold"
        >
          <span>
            {pending} commande{pending > 1 ? "s" : ""} à confirmer par téléphone
          </span>
          <span className="text-red underline">Voir</span>
        </Link>
      ) : null}

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Ventes du jour", value: formatPrice(stats.revenueToday), hint: `${stats.ordersToday} commande(s)` },
          { label: "Ventes du mois", value: formatPrice(stats.revenueMonth), hint: "hors annulations" },
          { label: "Reconditionnés en stock", value: String(stats.refurbishedAvailable), hint: "appareils uniques" },
          { label: "Reconditionnés vendus", value: String(stats.refurbishedSold), hint: "depuis le début" },
        ].map((item) => (
          <div key={item.label} className="card p-5">
            <dt className="text-sm text-ink-muted">{item.label}</dt>
            <dd className="mt-1 font-display text-2xl font-bold">{item.value}</dd>
            <dd className="text-xs text-ink-muted">{item.hint}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 xl:grid-cols-2">
        <section aria-labelledby="by-status" className="card p-5">
          <h2 id="by-status" className="text-lg">
            Commandes par statut
          </h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {STATUSES.map((status) => (
              <li key={status}>
                <Link href={`/admin/commandes?status=${status}`} className="flex justify-between py-2 hover:text-blue-ink">
                  <span>{STATUS_LABELS[status]}</span>
                  <span className="font-semibold tabular-nums">{stats.ordersByStatus[status] ?? 0}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="low-stock" className="card p-5">
          <h2 id="low-stock" className="text-lg">
            Stock faible (neufs, 2 ou moins)
          </h2>
          {stats.lowStock.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">Rien à réapprovisionner.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line text-sm">
              {stats.lowStock.map((row) => (
                <li key={row.sku}>
                  <Link href={`/admin/produits/${row.id}`} className="flex justify-between gap-3 py-2 hover:text-blue-ink">
                    <span>
                      {row.name} <span className="text-ink-muted">({row.sku})</span>
                    </span>
                    <span className={`font-semibold ${row.stock === 0 ? "text-red" : "text-amber"}`}>{row.stock}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
