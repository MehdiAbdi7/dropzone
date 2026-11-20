import type { OverviewChannel } from "@/features/admin/api/overviewApi";
import { formatPrice } from "@/lib/format";
import type { OrderType } from "@/types/api";
import { donutSegments, percentages, shortAmount } from "./chartMath";

// La répartition des ventes par canal (20/11) : un anneau et sa légende. Les couleurs sont celles du thème (elles
// suivent le clair et le sombre), toujours les mêmes d'un canal à l'autre.
const CHANNEL_STYLE: Record<OrderType, { label: string; color: string }> = {
  in_store: { label: "Magasin", color: "var(--blue)" },
  delivery: { label: "Livraison", color: "var(--red)" },
  pickup: { label: "Réservation", color: "var(--violet)" },
  exchange: { label: "Échange", color: "var(--amber)" },
};

const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ChannelsCard({ channels, days, loading }: { channels: OverviewChannel[] | undefined; days: number; loading: boolean }) {
  const rows = channels ?? [];
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const segments = donutSegments(
    rows.map((row) => row.total),
    CIRCUMFERENCE,
  );
  const shares = percentages(rows.map((row) => row.total));

  return (
    <section aria-labelledby="canaux" className="card space-y-4 p-4 sm:p-5">
      <div>
        <h2 id="canaux" className="text-lg">
          Ventes par canal
        </h2>
        <p className="text-sm text-ink-muted">sur {days} jours</p>
      </div>

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center xl:flex-col 2xl:flex-row">
        <div className="relative size-36 shrink-0">
          <svg viewBox="0 0 120 120" role="img" aria-label={`Ventes par canal : ${formatPrice(total)} en tout`} className="size-full -rotate-90">
            <circle cx={60} cy={60} r={RADIUS} fill="none" stroke="var(--surface-2)" strokeWidth={16} />
            {segments.map((segment, index) =>
              segment.length > 0 ? (
                <circle
                  key={rows[index].type}
                  cx={60}
                  cy={60}
                  r={RADIUS}
                  fill="none"
                  stroke={CHANNEL_STYLE[rows[index].type].color}
                  strokeWidth={16}
                  strokeDasharray={`${Math.max(segment.length - 1.5, 0)} ${CIRCUMFERENCE}`}
                  strokeDashoffset={-segment.offset}
                />
              ) : null,
            )}
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center">
            <p className="font-display text-xl font-extrabold tabular-nums">{loading ? "…" : shortAmount(total)}</p>
            <p className="text-xs text-ink-muted">{total === 0 && !loading ? "aucune vente" : "DA"}</p>
          </div>
        </div>

        <ul className="w-full min-w-0 space-y-2.5 text-sm">
          {rows.map((row, index) => (
            <li key={row.type} className="flex items-center gap-2.5">
              <span aria-hidden="true" className="size-3 shrink-0 rounded-full" style={{ background: CHANNEL_STYLE[row.type].color }} />
              <span className="min-w-0 flex-1 truncate font-semibold">{CHANNEL_STYLE[row.type].label}</span>
              <span className="tabular-nums text-ink-muted">{shares[index]} %</span>
              <span className="w-24 text-right font-bold tabular-nums">{formatPrice(row.total)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
