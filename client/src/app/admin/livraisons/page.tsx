"use client";

import { Suspense, useState } from "react";
import { useAdminOrdersQuery } from "@/features/admin/api/ordersApi";
import { useDeliverySummaryQuery } from "@/features/admin/api/deliveriesApi";
import EditDialog from "@/features/admin/products/EditDialog";
import OrderWindow from "@/features/admin/orders/OrderWindow";
import OrdersTable from "@/features/admin/orders/OrdersTable";
import OrdersTabs, { type OrdersTab } from "@/features/admin/orders/OrdersTabs";
import { useOrderWindow } from "@/features/admin/orders/useOrderWindow";
import { errorMessage } from "@/lib/errors";
import { formatPrice } from "@/lib/format";

// La page Livraisons (17/11, lot 4), premier onglet de la section Commandes. Une livraison se suit à
// part de la caisse : son argent n'est pas dans le tiroir, il arrive plus tard (le livreur ou la
// société de livraison le reverse). Ici : ce que les livraisons vont rapporter, ce qui est livré mais
// pas encore encaissé, et l'argent arrivé jour par jour. « Encaisser » écrit l'argent à la date du
// jour, dans l'historique (onglet Livraisons). La liste ne montre que les livraisons ACTIVES, en deux
// onglets : « Nouvelles commandes » (à confirmer par téléphone, pour ne pas les noyer) et « En cours »
// (confirmée, expédiée, livrée). Une livraison finie, annulée ou retournée se retrouve dans
// l'Historique. Chaque ligne porte un badge d'étape ; un clic ouvre la fenêtre de la livraison, placée
// sur l'étape où elle en est, avec ses boutons (« Confirmer », « Encaisser », « Colis retourné »…).
// L'ancien `?status=` des liens du tableau de bord est ignoré.

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
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const orderWindow = useOrderWindow();
  const summary = useDeliverySummaryQuery();
  // Les nouvelles s'ouvrent d'abord : c'est ce qui attend un appel.
  const [tab, setTab] = useState<OrdersTab>("new");
  const orders = useAdminOrdersQuery({ type: "delivery", stage: tab, q: q.trim() || undefined, page }, { pollingInterval: 30_000 });
  // Le nombre de chaque onglet : une page d'une seule ligne suffit, la réponse porte le total.
  const newCount = useAdminOrdersQuery({ type: "delivery", stage: "new", limit: 1, page: 1 }, { pollingInterval: 30_000 });
  const ongoingCount = useAdminOrdersQuery({ type: "delivery", stage: "ongoing", limit: 1, page: 1 }, { pollingInterval: 30_000 });
  const data = summary.data;
  const [daysOpen, setDaysOpen] = useState(false);

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl">Livraisons</h1>
        {/* L'argent arrivé jour par jour est derrière un bouton (refonte du 18/11). */}
        {data && data.collectedByDay.length > 0 ? (
          <button type="button" className="btn btn-secondary btn-small" onClick={() => setDaysOpen(true)}>
            Argent arrivé, jour par jour
          </button>
        ) : null}
      </div>

      {summary.isError ? (
        <p role="alert" className="field-error">
          {errorMessage(summary.error)}
        </p>
      ) : null}

      {data ? (
        <section aria-label="Chiffres des livraisons" className="grid grid-cols-2 gap-3 md:grid-cols-4">
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

      <section aria-label="Les livraisons" className="space-y-3">
        <OrdersTabs
          tab={tab}
          onChange={(next) => {
            setTab(next);
            setPage(1);
          }}
          newCount={newCount.data?.pagination.total}
          ongoingCount={ongoingCount.data?.pagination.total}
        />
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
            empty={tab === "new" ? "Aucune nouvelle commande." : "Aucune livraison en cours."}
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

      {data ? (
        <EditDialog open={daysOpen} title="Argent arrivé, jour par jour" size="sm" onClose={() => setDaysOpen(false)}>
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
        </EditDialog>
      ) : null}

      <OrderWindow id={orderWindow.id} onClose={orderWindow.close} />
    </div>
  );
}

function Card({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="card space-y-1 p-3 sm:p-4">
      <h2 className="text-xs font-semibold text-ink-muted sm:text-sm">{title}</h2>
      <p className="font-display text-xl font-bold tabular-nums sm:text-2xl">{value}</p>
      <p className="text-xs text-ink-muted sm:text-sm">{note}</p>
    </div>
  );
}
