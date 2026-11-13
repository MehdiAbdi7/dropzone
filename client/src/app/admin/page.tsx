"use client";

import Link from "next/link";
import { STATUS_LABELS } from "@/config/catalog";
import { useStatsQuery } from "@/features/admin/api/ordersApi";
import { formatPrice } from "@/lib/format";
import type { OrderStatus } from "@/types/api";

const STATUSES: OrderStatus[] = ["pending", "confirmed", "shipped", "delivered", "reserved", "cancelled"];

// L'accueil du back-office. Depuis le 14/11, il montre la journée du magasin (caisse, retraits
// attendus) au lieu du « stock faible » : avec les affaires, beaucoup d'articles sont toujours à
// 0, la liste ne disait rien.
export default function DashboardPage() {
  const { data: stats, isError } = useStatsQuery(undefined, { pollingInterval: 60_000 });

  if (isError) {
    return <p role="alert">Le tableau de bord ne répond pas.</p>;
  }
  if (!stats) {
    return <p className="text-ink-muted">Chargement…</p>;
  }

  const pending = stats.ordersByStatus.pending ?? 0;
  const { cash } = stats;

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

      <section aria-labelledby="journee" className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 id="journee" className="text-lg">
            Journée de caisse
          </h2>
          <p className="text-sm text-ink-muted">
            {!cash.open
              ? "Pas encore ouverte : ouvrez-la avec le fond de caisse avant la première vente."
              : cash.closed
                ? "Fermée pour aujourd'hui."
                : `Ouverte. Attendu dans le tiroir : ${formatPrice(cash.expectedCash ?? 0)}.`}
          </p>
        </div>
        <Link href="/admin/caisse" className={`btn ${cash.open ? "btn-secondary" : "btn-primary"}`}>
          {!cash.open ? "Ouvrir la journée" : "Voir la caisse"}
        </Link>
      </section>

      <dl className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {[
          { label: "Encaissé aujourd'hui", value: formatPrice(cash.cashedToday), hint: "tous moyens de paiement" },
          { label: "Ventes du jour", value: formatPrice(stats.revenueToday), hint: `${stats.ordersToday} commande(s), hors réservations` },
          { label: "Ventes du mois", value: formatPrice(stats.revenueMonth), hint: "hors annulations et réservations" },
          { label: "Affaires en stock", value: String(stats.refurbishedAvailable), hint: `${stats.refurbishedSold} vendues depuis le début` },
        ].map((item) => (
          <div key={item.label} className="card p-5">
            <dt className="text-sm text-ink-muted">{item.label}</dt>
            <dd className="mt-1 font-display text-2xl font-bold">{item.value}</dd>
            <dd className="text-xs text-ink-muted">{item.hint}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 xl:grid-cols-2">
        <section aria-labelledby="retraits" className="card p-5">
          <h2 id="retraits" className="text-lg">
            Retraits attendus aujourd&apos;hui
          </h2>
          {stats.pickupsToday.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">Aucun client n&apos;a réservé pour aujourd&apos;hui.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line text-sm">
              {stats.pickupsToday.map((pickup) => (
                <li key={pickup.id}>
                  <Link
                    href={`/admin/commandes/${pickup.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 py-2 hover:text-blue-ink"
                  >
                    <span>
                      <span className="font-display font-bold tabular-nums">{pickup.pickupTime.replace(":", "h")}</span>{" "}
                      {pickup.fullName} <span className="text-ink-muted">· n° {pickup.dailyNumber}</span>
                    </span>
                    <span className="font-semibold tabular-nums">{formatPrice(pickup.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

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
      </div>
    </div>
  );
}
