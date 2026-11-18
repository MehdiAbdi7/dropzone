"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useHistoryQuery, type HistoryChannelType } from "@/features/admin/api/historyApi";
import EditDialog from "@/features/admin/products/EditDialog";
import HistoryChanges from "@/features/admin/history/HistoryChanges";
import HistoryChannels, { CHANNEL_LABELS, CHANNEL_ORDER } from "@/features/admin/history/HistoryChannels";
import HistoryDays from "@/features/admin/history/HistoryDays";
import HistoryOrders from "@/features/admin/history/HistoryOrders";
import HistoryRepairs from "@/features/admin/history/HistoryRepairs";
import HistorySummary from "@/features/admin/history/HistorySummary";
import PeriodBar from "@/features/admin/history/PeriodBar";
import { historyHref, parseHistoryView } from "@/features/admin/history/historyView";
import OrderWindow from "@/features/admin/orders/OrderWindow";
import { useOrderWindow } from "@/features/admin/orders/useOrderWindow";
import { algiersDate } from "@/lib/algiersTime";
import { errorMessage } from "@/lib/errors";
import { periodRange } from "@/lib/period";
import { useDebouncedValue } from "@/lib/useDebouncedValue";

// Les 4 onglets (17/11, lot 4) : le Total, puis ce que rapporte chaque canal.
const TABS: { type: HistoryChannelType | undefined; label: string }[] = [
  { type: undefined, label: "Total" },
  ...CHANNEL_ORDER.map((type) => ({ type, label: CHANNEL_LABELS[type] })),
];

export default function HistoryPage() {
  return (
    <Suspense>
      <History />
    </Suspense>
  );
}

// L'historique du magasin (15/11, lot 2) : une période (jour, mois ou année), l'argent encaissé,
// les ventes et le bénéfice, les caisses, les commandes et les modifications. Réservé à l'admin.
function History() {
  const router = useRouter();
  const params = useSearchParams();
  // Un « aujourd'hui » figé au montage : la page ne doit pas changer de jour sous les yeux.
  const [today] = useState(() => algiersDate(new Date()));
  const view = parseHistoryView(params, today);
  const [q, setQ] = useState("");
  // La fenêtre ouverte (refonte du 18/11) : la page montre les chiffres, le reste est derrière un bouton.
  const [open, setOpen] = useState<Panel | null>(null);
  const orderWindow = useOrderWindow();
  const { from, to } = periodRange(view.kind, view.anchor);
  // La recherche attend une pause dans la saisie : chaque touche relancerait tout l'historique.
  const search = useDebouncedValue(q.trim());
  const { data, error, isFetching } = useHistoryQuery({ from, to, type: view.type, q: search || undefined });

  const go = (next: Partial<typeof view>) => router.replace(historyHref({ ...view, ...next }));

  const close = () => setOpen(null);
  const showChannels = view.type === undefined;
  const buttons: { key: Panel; label: string; count?: string }[] = [
    // Sous l'onglet Réparations, la liste est celle des fiches rendues, pas des commandes.
    view.type === "repair"
      ? { key: "orders" as const, label: "Réparations", count: data ? String(data.repairs.length) : undefined }
      : { key: "orders" as const, label: "Commandes", count: data ? `${data.orders.length}${data.ordersTruncated ? "+" : ""}` : undefined },
    { key: "days", label: "Par jour", count: data ? String(data.days.length) : undefined },
    ...(showChannels ? [{ key: "channels" as const, label: "Par canal" }] : []),
    { key: "changes", label: "Modifications", count: data ? String(data.changes.length) : undefined },
  ];

  return (
    <div className="max-w-5xl space-y-4">
      <h1 className="text-2xl sm:text-3xl">Historique</h1>
      <PeriodBar kind={view.kind} anchor={view.anchor} today={today} onChange={(next) => go(next)} />

      {/* Total, Magasin, Livraisons, Réservations : chaque onglet change tous les chiffres de la page. */}
      <div role="group" aria-label="Canal de vente" className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          // Un lien et non un bouton : l'animation de page se prépare au clic sur un lien (ShopPageTransition).
          <Link
            key={tab.type ?? "total"}
            replace
            scroll={false}
            href={historyHref({ ...view, type: tab.type })}
            className="chip"
            aria-current={view.type === tab.type ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}

      <div className={isFetching ? "space-y-4 opacity-70" : "space-y-4"} aria-busy={isFetching}>
        {/* L'argent, les ventes et le bénéfice restent en vue, avec leur détail (moyens de paiement, frais,
            corrections) : plus de bouton « Détail de l'argent » qui répétait les mêmes chiffres. */}
        {data ? (
          <HistorySummary totals={data.totals} />
        ) : (
          <p className="text-ink-muted">Chargement…</p>
        )}

        <div role="group" aria-label="Détails de la période" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {buttons.map((button) => (
            <button
              key={button.key}
              type="button"
              disabled={!data}
              className="card flex items-center justify-between gap-2 p-4 text-left font-display font-bold transition-[border-color] enabled:hover:border-blue-ink disabled:opacity-50"
              onClick={() => setOpen(button.key)}
            >
              <span>{button.label}</span>
              {button.count !== undefined ? (
                <span className="rounded-full bg-blue-soft px-2.5 py-0.5 text-sm tabular-nums">{button.count}</span>
              ) : (
                <span aria-hidden="true" className="text-ink-muted">
                  ›
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {data ? (
        <>
          <EditDialog open={open === "orders"} title={view.type === "repair" ? "Réparations de la période" : "Commandes de la période"} onClose={close}>
            <label className="block max-w-md">
              <span className="sr-only">{view.type === "repair" ? "Chercher une réparation" : "Chercher une commande"}</span>
              <input
                className="input"
                type="search"
                placeholder={view.type === "repair" ? "Numéro (R-1001), téléphone ou nom…" : "Numéro, téléphone ou nom…"}
                value={q}
                onChange={(event) => setQ(event.target.value)}
              />
            </label>
            {view.type === "repair" ? (
              <HistoryRepairs repairs={data.repairs} />
            ) : (
              <HistoryOrders orders={data.orders} truncated={data.ordersTruncated} onOpen={orderWindow.open} />
            )}
          </EditDialog>
          <EditDialog open={open === "days"} title="Jour par jour" onClose={close}>
            <HistoryDays days={data.days} tab={view.type} />
          </EditDialog>
          <EditDialog open={open === "channels"} title="Ce que rapporte chaque canal" onClose={close}>
            <HistoryChannels
              channels={data.channels}
              onPick={(type) => {
                close();
                go({ type });
              }}
            />
          </EditDialog>
          <EditDialog open={open === "changes"} title="Modifications et suppressions" onClose={close}>
            {data.changes.length === 0 ? <p className="text-ink-muted">Aucune modification sur cette période.</p> : <HistoryChanges changes={data.changes} />}
          </EditDialog>
        </>
      ) : null}

      <OrderWindow id={orderWindow.id} onClose={orderWindow.close} />
    </div>
  );
}

type Panel = "orders" | "days" | "channels" | "changes";
