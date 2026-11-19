import { ArrowRightIcon } from "@/components/ui/icons";
import { nameInitials } from "@/features/admin/adminIdentity";
import type { AdminOrderRow } from "@/features/admin/api/ordersApi";
import { formatDate, formatPrice } from "@/lib/format";
import type { OrderStatus, OrderType } from "@/types/api";
import { dailyLabel, receptionLabel, takenByLabel } from "./orderLabels";
import { stepBadge } from "./orderSteps";
import { unlimitedStage, unlimitedStageLabel } from "./reservationStage";

// Le tableau des commandes, partagé par Livraisons et Réservations (refait le 20/11). Un clic sur une ligne ouvre
// la fenêtre de la commande, comme le bouton « Voir ». À partir de 1280 px : un vrai tableau (la colonne « Passée
// le » s'ajoute à 1536 px) ; en dessous, jusqu'au téléphone : une carte par commande, sur deux colonnes dès la
// tablette. La barre latérale prend de la place : un tableau n'y tient pas avant 1280 px. Chaque commande porte un
// badge qui dit où elle en est (« 3/5 · Expédiée »).

// Ce qui demande une action du magasin ressort en rouge, ce qui est fini en bleu, le reste en gris.
const NEEDS_ACTION: OrderStatus[] = ["pending", "reserved", "delivered"];
const FINISHED: OrderStatus[] = ["collected", "picked_up"];

export function StatusBadge({
  type,
  status,
  reservation,
}: {
  type: OrderType;
  status: OrderStatus;
  // La réservation illimitée (18/11) : son badge dit où en est l'avance, pas « Réservée ».
  reservation?: Parameters<typeof unlimitedStage>[0];
}) {
  const stage = type === "pickup" && status === "reserved" && reservation ? unlimitedStage(reservation) : null;
  if (stage) {
    const tone = stage === "confirmed" ? "bg-blue-soft text-blue-ink" : "bg-red-soft text-red";
    return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${tone}`}>{unlimitedStageLabel(stage)}</span>;
  }
  const tone = NEEDS_ACTION.includes(status)
    ? "bg-red-soft text-red"
    : FINISHED.includes(status)
      ? "bg-blue-soft text-blue-ink"
      : "bg-surface-2 text-ink-muted";
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${tone}`}>{stepBadge(type, status)}</span>;
}

export default function OrdersTable({
  orders,
  busy,
  empty,
  onOpen,
}: {
  orders: AdminOrderRow[] | undefined;
  busy: boolean;
  empty: string;
  onOpen: (id: number) => void;
}) {
  return (
    <>
      {/* Téléphone et tablette : une carte par commande. */}
      {/* `grid-cols-1` : une colonne qui ne dépasse jamais l'écran (sans elle, la colonne s'élargissait avec le contenu). */}
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:hidden" aria-busy={busy}>
        {orders?.map((order) => (
          <li key={order.id}>
            <button type="button" onClick={() => onOpen(order.id)} className="card flex h-full w-full items-center gap-3 p-3.5 text-left">
              <span className="admin-avatar" aria-hidden="true">
                {nameInitials(order.fullName)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{order.fullName}</span>
                <span className="block font-display text-sm font-bold text-blue-ink">{dailyLabel(order.dailyNumber, order.businessDate)}</span>
                <span className="block truncate text-xs text-ink-muted">{receptionLabel(order)}</span>
                {takenByLabel(order) ? <span className="block truncate text-xs text-ink-muted">{takenByLabel(order)}</span> : null}
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1.5">
                <StatusBadge type={order.type} status={order.status} reservation={order} />
                <span className="font-bold tabular-nums">{formatPrice(order.total)}</span>
              </span>
            </button>
          </li>
        ))}
        {orders && orders.length === 0 ? <li className="card p-6 text-ink-muted md:col-span-2">{empty}</li> : null}
      </ul>

      {/* Ordinateur : le tableau. */}
      <div className="card hidden overflow-hidden xl:block" aria-busy={busy}>
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Commande</th>
              <th scope="col">Client</th>
              <th scope="col">Réception</th>
              <th scope="col" className="hidden 2xl:table-cell">
                Passée le
              </th>
              <th scope="col" className="text-right">
                Total
              </th>
              <th scope="col">Statut</th>
              <th scope="col">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {orders?.map((order) => (
              // La ligne entière se clique à la souris ; le bouton « Voir » sert au clavier.
              <tr key={order.id} onClick={() => onOpen(order.id)}>
                <td>
                  <span className="font-display font-bold text-blue-ink">{dailyLabel(order.dailyNumber, order.businessDate)}</span>
                  <br />
                  <span className="text-xs text-ink-muted">suivi {order.number}</span>
                </td>
                <td>
                  <span className="flex items-center gap-3">
                    <span className="admin-avatar" aria-hidden="true">
                      {nameInitials(order.fullName)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{order.fullName}</span>
                      <span className="block text-xs text-ink-muted">{order.phone}</span>
                    </span>
                  </span>
                </td>
                <td>
                  {receptionLabel(order)}
                  {takenByLabel(order) ? (
                    <>
                      <br />
                      <span className="text-xs text-ink-muted">{takenByLabel(order)}</span>
                    </>
                  ) : null}
                </td>
                <td className="hidden whitespace-nowrap text-ink-muted 2xl:table-cell">{formatDate(order.createdAt)}</td>
                <td className="text-right font-bold tabular-nums">{formatPrice(order.total)}</td>
                <td>
                  <StatusBadge type={order.type} status={order.status} reservation={order} />
                </td>
                <td className="text-right">
                  <button
                    type="button"
                    className="btn btn-secondary btn-small gap-1.5"
                    aria-label={`Voir la commande ${dailyLabel(order.dailyNumber, order.businessDate)}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpen(order.id);
                    }}
                  >
                    Voir
                    <ArrowRightIcon size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders && orders.length === 0 ? <p className="p-6 text-ink-muted">{empty}</p> : null}
      </div>
    </>
  );
}
