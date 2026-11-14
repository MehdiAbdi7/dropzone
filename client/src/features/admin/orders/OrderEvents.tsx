import type { AdminOrder } from "@/features/admin/api/ordersApi";
import { formatDate, formatPrice } from "@/lib/format";

// Les modifications faites à la commande après coup : quand, quoi, de combien. Rien ne s'efface.
export default function OrderEvents({ events }: { events: AdminOrder["events"] }) {
  if (events.length === 0) return null;
  return (
    <section className="card space-y-2 p-5 text-sm" aria-labelledby="events-title">
      <h2 id="events-title" className="text-lg">
        Modifications
      </h2>
      <ul className="divide-y divide-line">
        {events.map((event) => (
          <li key={event.id} className="space-y-1 py-2">
            <p className="text-xs text-ink-muted">
              {formatDate(event.createdAt)}
              {event.amountDelta !== 0 ? ` · ${event.amountDelta > 0 ? "+" : ""}${formatPrice(event.amountDelta)}` : ""}
            </p>
            <p>{event.summary}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
