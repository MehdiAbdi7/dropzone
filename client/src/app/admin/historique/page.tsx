"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useHistoryQuery } from "@/features/admin/api/historyApi";
import EditDialog from "@/features/admin/products/EditDialog";
import HistoryChanges from "@/features/admin/history/HistoryChanges";
import HistoryChannels, { CHANNEL_LABELS, CHANNEL_ORDER } from "@/features/admin/history/HistoryChannels";
import HistoryDays from "@/features/admin/history/HistoryDays";
import HistoryOrders from "@/features/admin/history/HistoryOrders";
import HistorySummary from "@/features/admin/history/HistorySummary";
import PeriodBar from "@/features/admin/history/PeriodBar";
import { historyHref, parseHistoryView } from "@/features/admin/history/historyView";
import OrderWindow from "@/features/admin/orders/OrderWindow";
import { useOrderWindow } from "@/features/admin/orders/useOrderWindow";
import { algiersDate } from "@/lib/algiersTime";
import { errorMessage } from "@/lib/errors";
import { formatPrice } from "@/lib/format";
import { periodRange } from "@/lib/period";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import type { OrderType } from "@/types/api";

// Les 4 onglets (17/11, lot 4) : le Total, puis ce que rapporte chaque canal.
const TABS: { type: OrderType | undefined; label: string }[] = [
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
    { key: "orders", label: "Commandes", count: data ? `${data.orders.length}${data.ordersTruncated ? "+" : ""}` : undefined },
    { key: "days", label: "Par jour", count: data ? String(data.days.length) : undefined },
    ...(showChannels ? [{ key: "channels" as const, label: "Par canal" }] : []),
    { key: "changes", label: "Modifications", count: data ? String(data.changes.length) : undefined },
    { key: "money", label: "Détail de l'argent" },
  ];

  return (
    <div className="max-w-5xl space-y-4">
      <h1 className="text-2xl sm:text-3xl">Historique</h1>
      <PeriodBar kind={view.kind} anchor={view.anchor} today={today} onChange={(next) => go(next)} />

      {/* Total, Magasin, Livraisons, Réservations : chaque onglet change tous les chiffres de la page. */}
      <div role="group" aria-label="Canal de vente" className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.type ?? "total"}
            type="button"
            className="chip"
            aria-pressed={view.type === tab.type}
            onClick={() => go({ type: tab.type })}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}

      <div className={isFetching ? "space-y-4 opacity-70" : "space-y-4"} aria-busy={isFetching}>
        {/* Les trois chiffres qui comptent restent en vue ; tout le reste est derrière un bouton. */}
        {data ? (
          <section aria-label="Chiffres de la période" className="grid grid-cols-3 gap-3">
            <Kpi label="Encaissé" value={formatPrice(data.totals.collected)} />
            <Kpi label="Ventes" value={String(data.totals.salesCount)} />
            <Kpi label="Bénéfice" value={formatPrice(data.totals.profit)} />
          </section>
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
          <EditDialog open={open === "orders"} title="Commandes de la période" onClose={close}>
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
            <HistoryOrders orders={data.orders} truncated={data.ordersTruncated} onOpen={orderWindow.open} />
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
          <EditDialog open={open === "money"} title="Détail de l'argent" onClose={close}>
            <HistorySummary totals={data.totals} />
          </EditDialog>
        </>
      ) : null}

      <OrderWindow id={orderWindow.id} onClose={orderWindow.close} />
    </div>
  );
}

type Panel = "orders" | "days" | "channels" | "changes" | "money";

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3 sm:p-5">
      <h2 className="text-xs font-semibold text-ink-muted sm:text-sm">{label}</h2>
      <p className="font-display text-lg font-bold tabular-nums sm:text-3xl">{value}</p>
    </div>
  );
}
