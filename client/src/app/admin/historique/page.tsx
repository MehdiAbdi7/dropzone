"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useHistoryQuery } from "@/features/admin/api/historyApi";
import HistoryChanges from "@/features/admin/history/HistoryChanges";
import HistoryChannels, { CHANNEL_LABELS, CHANNEL_ORDER } from "@/features/admin/history/HistoryChannels";
import HistoryDays from "@/features/admin/history/HistoryDays";
import HistoryOrders from "@/features/admin/history/HistoryOrders";
import HistorySummary from "@/features/admin/history/HistorySummary";
import PeriodBar from "@/features/admin/history/PeriodBar";
import { historyHref, parseHistoryView } from "@/features/admin/history/historyView";
import { algiersDate } from "@/lib/algiersTime";
import { errorMessage } from "@/lib/errors";
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
  const { from, to } = periodRange(view.kind, view.anchor);
  // La recherche attend une pause dans la saisie : chaque touche relancerait tout l'historique.
  const search = useDebouncedValue(q.trim());
  const { data, error, isFetching } = useHistoryQuery({ from, to, type: view.type, q: search || undefined });

  const go = (next: Partial<typeof view>) => router.replace(historyHref({ ...view, ...next }));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Historique</h1>
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

      <div className={isFetching ? "space-y-6 opacity-70" : "space-y-6"} aria-busy={isFetching}>
        {data ? <HistorySummary totals={data.totals} /> : <p className="text-ink-muted">Chargement…</p>}
        {/* Sous le Total : ce que rapporte chacun des trois canaux, qui se somment dans le Total. */}
        {data && view.type === undefined ? <HistoryChannels channels={data.channels} onPick={(type) => go({ type })} /> : null}
        {data ? <HistoryDays days={data.days} tab={view.type} /> : null}

        <div className="space-y-3">
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
        </div>

        {data ? <HistoryOrders orders={data.orders} truncated={data.ordersTruncated} /> : null}
        {data ? <HistoryChanges changes={data.changes} /> : null}
      </div>
    </div>
  );
}
