import type { AdminOrderRow } from "@/features/admin/api/ordersApi";
import { formatDate, formatPrice } from "@/lib/format";
import type { OrderStatus, OrderType } from "@/types/api";
import { dailyLabel, receptionLabel } from "./orderLabels";
import { stepBadge } from "./orderSteps";

// Le tableau des commandes, partagé par Livraisons et Retraits. Un clic sur une ligne ouvre la fenêtre
// de la commande. À partir de 768 px : un vrai tableau ; en dessous : une carte par commande, comme
// une application. Chaque commande porte EN TÊTE un badge qui dit où elle en est (« 3/5 · Expédiée »).

// Ce qui demande une action du magasin ressort en rouge, ce qui est fini en bleu, le reste en gris.
const NEEDS_ACTION: OrderStatus[] = ["pending", "reserved", "delivered"];
const FINISHED: OrderStatus[] = ["collected", "picked_up"];

export function StatusBadge({ type, status }: { type: OrderType; status: OrderStatus }) {
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
      <ul className="space-y-2 md:hidden" aria-busy={busy}>
        {orders?.map((order) => (
          <li key={order.id}>
            <button type="button" onClick={() => onOpen(order.id)} className="card flex w-full items-center gap-3 p-3 text-left">
              <span className="min-w-0 flex-1 space-y-0.5">
                <StatusBadge type={order.type} status={order.status} />
                <span className="block font-display font-bold text-blue-ink">{dailyLabel(order.dailyNumber, order.businessDate)}</span>
                <span className="block truncate text-sm font-semibold">{order.fullName}</span>
                <span className="block truncate text-xs text-ink-muted">{receptionLabel(order)}</span>
              </span>
              <span className="shrink-0 font-bold tabular-nums">{formatPrice(order.total)}</span>
            </button>
          </li>
        ))}
        {orders && orders.length === 0 ? <li className="card p-6 text-ink-muted">{empty}</li> : null}
      </ul>

      <div className="card hidden overflow-x-auto md:block" aria-busy={busy}>
        <table className="table min-w-[760px]">
          <thead>
            <tr>
              <th scope="col">Où elle en est</th>
              <th scope="col">N° du jour</th>
              <th scope="col">Client</th>
              <th scope="col">Réception</th>
              <th scope="col">Passée le</th>
              <th scope="col" className="text-right">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {orders?.map((order) => (
              // La ligne entière se clique à la souris ; le bouton du numéro sert au clavier.
              <tr key={order.id} onClick={() => onOpen(order.id)} className="cursor-pointer hover:bg-surface-2/60">
                <td>
                  <StatusBadge type={order.type} status={order.status} />
                </td>
                <td>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpen(order.id);
                    }}
                    className="font-display font-bold text-blue-ink underline"
                  >
                    {dailyLabel(order.dailyNumber, order.businessDate)}
                  </button>
                  <br />
                  <span className="text-xs text-ink-muted">suivi {order.number}</span>
                </td>
                <td>
                  {order.fullName}
                  <br />
                  <span className="text-ink-muted">{order.phone}</span>
                </td>
                <td>{receptionLabel(order)}</td>
                <td>{formatDate(order.createdAt)}</td>
                <td className="text-right font-semibold tabular-nums">{formatPrice(order.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders && orders.length === 0 ? <p className="p-6 text-ink-muted">{empty}</p> : null}
      </div>
    </>
  );
}
