"use client";

import Link from "next/link";
import { useState } from "react";
import { useTradeInsQuery } from "@/features/admin/api/exchangeApi";
import { useStatsQuery } from "@/features/admin/api/ordersApi";
import { useOverviewQuery, type OverviewDays } from "@/features/admin/api/overviewApi";
import ActivityChart from "@/features/admin/dashboard/ActivityChart";
import ChannelsCard from "@/features/admin/dashboard/ChannelsCard";
import type { Metric } from "@/features/admin/dashboard/chartMath";
import RecentSalesCard from "@/features/admin/dashboard/RecentSalesCard";
import StatusCard from "@/features/admin/dashboard/StatusCard";
import EditDialog from "@/features/admin/products/EditDialog";
import { formatPrice } from "@/lib/format";
import { useNow } from "@/lib/useNow";

// L'accueil du back-office. Depuis le 14/11, il montre la journée du magasin (caisse, retraits
// attendus) au lieu du « stock faible » : avec les affaires, beaucoup d'articles sont toujours à
// 0, la liste ne disait rien. Depuis le 20/11, il a aussi des graphiques : un grand graphique dont la liste
// déroulante choisit la mesure (ventes, commandes, bénéfice, encaissé) sur 7 ou 30 jours, la répartition par canal,
// les derniers produits vendus et les commandes par statut. Chaque grille garde `min-w-0` à ses enfants : sans lui, un
// graphique large élargirait la page au lieu de s'adapter à l'écran.
export default function DashboardPage() {
  const [pickupsOpen, setPickupsOpen] = useState(false);
  const [days, setDays] = useState<OverviewDays>(7);
  const [metric, setMetric] = useState<Metric>("sales");
  const now = useNow();
  const { data: stats, isError } = useStatsQuery(undefined, { pollingInterval: 60_000 });
  const overview = useOverviewQuery(days, { pollingInterval: 60_000 });
  // Les téléphones repris en échange qui attendent un prix de revente (lot 5).
  const { data: tradeIns } = useTradeInsQuery("pending", { pollingInterval: 60_000 });

  if (isError) {
    return <p role="alert">Le tableau de bord ne répond pas.</p>;
  }
  if (!stats) {
    return <p className="text-ink-muted">Chargement…</p>;
  }

  const { cash } = stats;
  // Pendant le changement de période, l'ancienne réponse reste affichée (RTK Query la garde) : seul le premier
  // chargement montre « … ».
  const loading = overview.isLoading;

  // Les commandes à confirmer ne s'annoncent plus ici : l'alerte du back-office (son et bannière, sur
  // toutes les pages) et la pastille rouge de « Commandes » le font déjà.
  return (
    <div className="space-y-4">
      <h1 className="text-2xl sm:text-3xl">Tableau de bord</h1>

      <section aria-labelledby="journee" className="card flex flex-wrap items-center justify-between gap-3 p-4">
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

      {/* Les reprises sont en stock mais PAS en vente : elles attendent le prix de revente de l'admin. */}
      {tradeIns && tradeIns.length > 0 ? (
        <section aria-labelledby="reprises" className="card flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <h2 id="reprises" className="text-lg">
              Reprises à mettre en vente
            </h2>
            <p className="text-sm text-ink-muted">
              {tradeIns.length === 1
                ? "1 téléphone repris attend son prix de revente."
                : `${tradeIns.length} téléphones repris attendent leur prix de revente.`}
            </p>
          </div>
          <Link href="/admin/reprises" className="btn btn-primary">
            Fixer les prix
          </Link>
        </section>
      ) : null}

      <dl className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {[
          { label: "Encaissé aujourd'hui", value: formatPrice(cash.cashedToday), hint: "tous moyens de paiement" },
          { label: "Ventes du jour", value: formatPrice(stats.revenueToday), hint: `${stats.ordersToday} commande(s), hors réservations` },
          { label: "Ventes du mois", value: formatPrice(stats.revenueMonth), hint: "hors annulations et réservations" },
          { label: "Affaires en stock", value: String(stats.refurbishedAvailable), hint: `${stats.refurbishedSold} vendues depuis le début` },
        ].map((item) => (
          <div key={item.label} className="card p-3 sm:p-4">
            <dt className="text-sm text-ink-muted">{item.label}</dt>
            <dd className="mt-1 font-display text-xl font-bold sm:text-2xl">{item.value}</dd>
            <dd className="text-xs text-ink-muted">{item.hint}</dd>
          </div>
        ))}
      </dl>

      {overview.isError ? (
        <p role="alert" className="card p-4 text-sm font-semibold text-red">
          Les graphiques ne répondent pas, réessayez dans un instant.
        </p>
      ) : null}

      {/* Le grand graphique et l'anneau des canaux : côte à côte sur grand écran, l'un sous l'autre sinon. */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <ActivityChart
            series={overview.data?.series}
            days={days}
            onDays={setDays}
            metric={metric}
            onMetric={setMetric}
            profitUnknown={overview.data?.profitUnknown ?? 0}
            loading={loading}
          />
        </div>
        <div className="min-w-0">
          <ChannelsCard channels={overview.data?.channels} days={days} loading={loading} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <RecentSalesCard sales={overview.data?.recent} loading={loading} now={now} />
        </div>
        <div className="min-w-0 space-y-4">
          <StatusCard counts={stats.ordersByStatus} />
          {/* La liste des réservations du jour est derrière un bouton (refonte du 18/11). */}
          <button
            type="button"
            onClick={() => setPickupsOpen(true)}
            className="card flex w-full items-center justify-between gap-2 p-4 text-left font-display font-bold"
          >
            <span>Réservations attendues aujourd&apos;hui</span>
            <span className="rounded-full bg-blue-soft px-2.5 py-0.5 text-sm tabular-nums">{stats.pickupsToday.length}</span>
          </button>
        </div>
      </div>

      <EditDialog open={pickupsOpen} title="Réservations attendues aujourd'hui" onClose={() => setPickupsOpen(false)}>
        {stats.pickupsToday.length === 0 ? (
          <p className="text-sm text-ink-muted">Aucun client n&apos;a réservé pour aujourd&apos;hui.</p>
        ) : (
          <ul className="card divide-y divide-line text-sm">
            {stats.pickupsToday.map((pickup) => (
              <li key={pickup.id}>
                <Link href={`/admin/commandes/${pickup.id}`} className="flex flex-wrap items-center justify-between gap-3 py-2 hover:text-blue-ink">
                  <span>
                    <span className="font-display font-bold tabular-nums">{pickup.pickupTime.replace(":", "h")}</span> {pickup.fullName}{" "}
                    <span className="text-ink-muted">· n° {pickup.dailyNumber}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatPrice(pickup.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </EditDialog>
    </div>
  );
}
