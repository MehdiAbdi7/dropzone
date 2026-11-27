import Link from "next/link";
import { STATUS_LABELS } from "@/config/catalog";
import type { History, HistoryOrder } from "@/features/admin/api/historyApi";
import { Cost } from "@/features/admin/costs/CostGuard";
import { invoiceAvailable } from "@/features/admin/invoice/invoiceRules";
import { dailyLabel } from "@/features/admin/orders/orderLabels";
import { formatPrice } from "@/lib/format";
import { ORDER_TYPE_LABELS } from "@/config/catalog";

// Le bénéfice d'une commande : « — » tant qu'elle n'est pas vendue, « inconnu » quand un prix
// d'achat manque (jamais un faux chiffre).
function profitText(order: HistoryOrder): string {
  if (order.saleDate === null) return "—";
  return order.profit === null ? "inconnu" : formatPrice(order.profit);
}

// La réduction accordée sur une commande (lot 3) : « −9 000 DA » ; « +5 000 DA » quand un prix dépasse le catalogue.
const discountText = (discount: number) => `${discount > 0 ? "−" : "+"}${formatPrice(Math.abs(discount))}`;

// Les commandes créées ou encaissées dans la période. Chaque ligne ouvre la commande, où se
// trouvent Modifier et Supprimer.
export default function HistoryOrders({ orders, truncated, onOpen }: { orders: History["orders"]; truncated: boolean; onOpen: (id: number) => void }) {
  return (
    <section aria-labelledby="orders-title" className="space-y-3">
      <h2 id="orders-title" className="text-xl">
        Commandes
      </h2>
      {truncated ? (
        <p role="status" className="card border-amber p-3 text-sm">
          Seules les 500 commandes les plus récentes sont listées. Les totaux ci-dessus comptent toute la période : pour voir
          les autres, choisissez une période plus courte.
        </p>
      ) : null}

      <ul className="space-y-2 md:hidden">
        {orders.map((order) => (
          <li key={order.id} className="card">
            <button type="button" onClick={() => onOpen(order.id)} className="flex w-full items-center gap-3 p-3 text-left">
              <span className="min-w-0 flex-1">
                <span className="font-display font-bold text-blue-ink">{dailyLabel(order.dailyNumber, order.businessDate)}</span>
                <span className="block truncate text-sm font-semibold">{order.fullName}</span>
                <span className="block text-xs text-ink-muted">
                  {ORDER_TYPE_LABELS[order.type]} · {STATUS_LABELS[order.status]}
                </span>
              </span>
              <span className="shrink-0 text-right text-sm">
                <span className="block font-bold">{formatPrice(order.total)}</span>
                <span className="block text-ink-muted">payé {formatPrice(order.paid)}</span>
                <span className="block text-ink-muted">
                  bénéfice <Cost label="Bénéfice">{profitText(order)}</Cost>
                </span>
                {order.discount !== 0 ? (
                  <span className="block text-ink-muted">
                    {order.discount > 0 ? "réduction" : "supplément"} {formatPrice(Math.abs(order.discount))}
                  </span>
                ) : null}
              </span>
            </button>
            {/* Un lien ne se met pas dans un bouton : la facture (lot 6) est sous la ligne cliquable. */}
            {invoiceAvailable(order) ? (
              <div className="border-t border-line px-3 py-2">
                <Link href={`/admin/facture/${order.id}`} target="_blank" className="text-sm font-semibold text-blue-ink underline">
                  Facture : voir ou télécharger
                </Link>
              </div>
            ) : null}
          </li>
        ))}
        {orders.length === 0 ? <li className="card p-6 text-ink-muted">Aucune commande sur cette période.</li> : null}
      </ul>

      <div className="card hidden overflow-x-auto md:block">
        <table className="table min-w-[760px]">
          <thead>
            <tr>
              <th scope="col">N° du jour</th>
              <th scope="col">Client</th>
              <th scope="col">Type</th>
              <th scope="col">Statut</th>
              <th scope="col">Total</th>
              <th scope="col">Payé</th>
              <th scope="col">Bénéfice</th>
              <th scope="col">Réduction</th>
              <th scope="col">Facture</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>
                  <button type="button" onClick={() => onOpen(order.id)} className="font-display font-bold text-blue-ink underline">
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
                <td>{ORDER_TYPE_LABELS[order.type]}</td>
                <td>{STATUS_LABELS[order.status]}</td>
                <td className="tabular-nums">{formatPrice(order.total)}</td>
                <td className="tabular-nums">{formatPrice(order.paid)}</td>
                <td className="tabular-nums">
                  <Cost label="Bénéfice">{profitText(order)}</Cost>
                </td>
                <td className="tabular-nums">{order.discount === 0 ? "—" : discountText(order.discount)}</td>
                <td>
                  {/* Voir ou télécharger (impression ou PDF) : possible selon le type et l'étape de la commande. */}
                  {invoiceAvailable(order) ? (
                    <Link
                      href={`/admin/facture/${order.id}`}
                      target="_blank"
                      aria-label={`Facture de ${order.fullName}, commande ${dailyLabel(order.dailyNumber, order.businessDate)}`}
                      className="font-semibold text-blue-ink underline"
                    >
                      Facture
                    </Link>
                  ) : (
                    <span className="text-ink-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 ? <p className="p-6 text-ink-muted">Aucune commande sur cette période.</p> : null}
      </div>
    </section>
  );
}
