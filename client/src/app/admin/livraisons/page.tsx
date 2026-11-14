"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { STATUS_LABELS } from "@/config/catalog";
import { useAdminOrdersQuery } from "@/features/admin/api/ordersApi";
import { useDeliverySummaryQuery } from "@/features/admin/api/deliveriesApi";
import OrderWindow from "@/features/admin/orders/OrderWindow";
import OrdersTable from "@/features/admin/orders/OrdersTable";
import { useOrderWindow } from "@/features/admin/orders/useOrderWindow";
import { errorMessage } from "@/lib/errors";
import { formatPrice } from "@/lib/format";
import type { OrderStatus } from "@/types/api";

// La page Livraisons (17/11, lot 4), premier onglet de la section Commandes. Une livraison se suit à
// part de la caisse : son argent n'est pas dans le tiroir, il arrive plus tard (le livreur ou la
// société de livraison le reverse). Ici : ce que les livraisons vont rapporter, ce qui est livré mais
// pas encore encaissé, et l'argent arrivé jour par jour. « Encaisser » écrit l'argent à la date du
// jour, dans l'historique (onglet Livraisons). L'état choisi vit dans l'adresse (`?status=`) : un lien
// du tableau de bord ouvre le bon état. Un clic sur une livraison ouvre sa fenêtre, placée sur
// l'étape où elle en est : « Encaisser », « Colis retourné » et les autres boutons y sont.
const TABS: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "À confirmer" },
  { status: "confirmed", label: "En préparation" },
  { status: "shipped", label: "Expédiées" },
  { status: "delivered", label: "À encaisser" },
  { status: "collected", label: "Encaissées" },
  { status: "returned", label: "Retournées" },
  { status: "cancelled", label: "Annulées" },
];
const KNOWN = TABS.map((tab) => tab.status);

const dayLabel = (iso: string) => {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
};

export default function DeliveriesPage() {
  return (
    <Suspense>
      <Deliveries />
    </Suspense>
  );
}

function Deliveries() {
  const router = useRouter();
  const params = useSearchParams();
  const asked = params.get("status") as OrderStatus | null;
  // Par défaut : ce qui attend d'être encaissé, le plus utile au quotidien.
  const status: OrderStatus = asked && KNOWN.includes(asked) ? asked : "delivered";
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const orderWindow = useOrderWindow();
  const summary = useDeliverySummaryQuery();
  const orders = useAdminOrdersQuery({ type: "delivery", status, q: q.trim() || undefined, page }, { pollingInterval: 30_000 });
  const data = summary.data;

  const pick = (next: OrderStatus) => {
    setPage(1);
    router.replace(`/admin/livraisons?status=${next}`);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-3xl">Livraisons</h1>

      {summary.isError ? (
        <p role="alert" className="field-error">
          {errorMessage(summary.error)}
        </p>
      ) : null}

      {data ? (
        <section aria-label="Chiffres des livraisons" className="grid gap-4 md:grid-cols-4">
          <Card title="En cours" value={formatPrice(data.inProgress.total)} note={`${data.inProgress.count} livraison${data.inProgress.count > 1 ? "s" : ""} à venir`} />
          <Card title="À encaisser" value={formatPrice(data.toCollect.total)} note={`${data.toCollect.count} livrée${data.toCollect.count > 1 ? "s" : ""}, argent pas encore arrivé`} />
          <Card title="Encaissé en tout" value={formatPrice(data.collectedTotal)} note="Hors caisse du magasin" />
          <Card
            title="Retournées"
            value={String(data.returned.count)}
            note={data.returned.fees > 0 ? `Frais de retour payés : ${formatPrice(data.returned.fees)}` : "Colis refusés, stock remis"}
          />
        </section>
      ) : (
        <p className="text-ink-muted">Chargement…</p>
      )}

      {data && data.collectedByDay.length > 0 ? (
        <section aria-labelledby="by-day" className="space-y-3">
          <h2 id="by-day" className="text-xl">
            Argent arrivé, jour par jour
          </h2>
          <div className="card overflow-x-auto">
            <table className="table min-w-[320px]">
              <thead>
                <tr>
                  <th scope="col">Jour</th>
                  <th scope="col">Encaissé</th>
                </tr>
              </thead>
              <tbody>
                {data.collectedByDay.map((day) => (
                  <tr key={day.date}>
                    <th scope="row" className="font-semibold">
                      {dayLabel(day.date)}
                    </th>
                    <td className="tabular-nums">{formatPrice(day.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="list-title" className="space-y-3">
        <h2 id="list-title" className="text-xl">
          Les livraisons
        </h2>
        <div role="group" aria-label="État de la livraison" className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button key={tab.status} type="button" className="chip" aria-pressed={status === tab.status} onClick={() => pick(tab.status)}>
              {tab.label}
            </button>
          ))}
        </div>
        <label className="block max-w-md">
          <span className="sr-only">Chercher une livraison</span>
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
        {orders.isError ? (
          <p role="alert" className="field-error">
            {errorMessage(orders.error)}
          </p>
        ) : (
          <OrdersTable
            orders={orders.data?.data}
            busy={orders.isFetching}
            empty={`Aucune livraison « ${STATUS_LABELS[status]} ».`}
            onOpen={orderWindow.open}
          />
        )}
        {orders.data && orders.data.pagination.pages > 1 ? (
          <div className="flex items-center justify-center gap-3">
            <button type="button" className="btn btn-secondary btn-small" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Précédente
            </button>
            <p className="text-sm">
              Page {orders.data.pagination.page} sur {orders.data.pagination.pages}
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              disabled={page >= orders.data.pagination.pages}
              onClick={() => setPage(page + 1)}
            >
              Suivante
            </button>
          </div>
        ) : null}
      </section>

      <OrderWindow id={orderWindow.id} onClose={orderWindow.close} />
    </div>
  );
}

function Card({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="card space-y-2 p-5">
      <h2 className="text-sm font-semibold text-ink-muted">{title}</h2>
      <p className="font-display text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-sm text-ink-muted">{note}</p>
    </div>
  );
}
