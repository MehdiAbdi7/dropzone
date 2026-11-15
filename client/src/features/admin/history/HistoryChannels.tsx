import type { History } from "@/features/admin/api/historyApi";
import { formatPrice } from "@/lib/format";
import type { OrderType } from "@/types/api";

// Les noms des onglets de l'historique : ce que chaque canal rapporte au gérant.
export const CHANNEL_LABELS: Record<OrderType, string> = {
  in_store: "Magasin",
  delivery: "Livraisons",
  pickup: "Réservations",
  exchange: "Échanges",
};
export const CHANNEL_ORDER: OrderType[] = ["in_store", "delivery", "pickup", "exchange"];

// Sous l'onglet Total : ce que chaque canal a rapporté sur la période (argent arrivé, ventes,
// bénéfice). La somme des canaux est le Total affiché au-dessus.
export default function HistoryChannels({ channels, onPick }: { channels: History["channels"]; onPick: (type: OrderType) => void }) {
  return (
    <section aria-labelledby="channels-title" className="space-y-3">
      <h2 id="channels-title" className="text-xl">
        Ce que rapporte chaque canal
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CHANNEL_ORDER.map((type) => {
          const channel = channels[type];
          return (
            <button key={type} type="button" className="card space-y-2 p-5 text-left" onClick={() => onPick(type)}>
              <span className="text-sm font-semibold text-ink-muted">{CHANNEL_LABELS[type]}</span>
              <span className="block font-display text-2xl font-bold tabular-nums">{formatPrice(channel.collected)}</span>
              <span className="block text-sm text-ink-muted">
                {channel.salesCount} vente{channel.salesCount > 1 ? "s" : ""} · bénéfice {formatPrice(channel.profit)}
              </span>
              {channel.returnFees > 0 ? (
                <span className="block text-sm text-ink-muted">dont frais de retour payés : −{formatPrice(channel.returnFees)}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
