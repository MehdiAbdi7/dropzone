"use client";

import { useState } from "react";
import type { OverviewDays } from "@/features/admin/api/overviewApi";
import { formatPrice } from "@/lib/format";
import { useElementWidth } from "@/lib/useElementWidth";
import {
  axisTicks,
  labelEvery,
  METRICS,
  metricValue,
  niceMax,
  shortAmount,
  shortDayLabel,
  totalOf,
  type Metric,
  type OverviewPoint,
} from "./chartMath";

// Le grand graphique du tableau de bord (20/11) : une barre par jour, et en haut à droite une liste déroulante pour
// choisir ce qu'il montre (ventes, commandes, bénéfice, encaissé) et le choix de 7 ou 30 jours. Dessiné à la main en
// SVG, à la largeur réelle de la carte (`useElementWidth`, 1 unité = 1 pixel) : le texte garde sa taille sur
// téléphone au lieu de rétrécir avec le dessin. Au survol, au toucher ou au clavier, un jour affiche son détail ; un
// tableau caché (`sr-only`) donne les mêmes chiffres aux lecteurs d'écran.

const MARGIN = { left: 48, right: 8, top: 12, bottom: 30 };
// Sous cette largeur (téléphone), les jours s'écrivent « 14/11 » : « sam. 14 » toucherait son voisin.
const COMPACT_BELOW = 480;

const dayMonth = (date: string) => date.slice(8, 10) + "/" + date.slice(5, 7);

export default function ActivityChart({
  series,
  days,
  onDays,
  metric,
  onMetric,
  profitUnknown,
  loading,
}: {
  series: OverviewPoint[] | undefined;
  days: OverviewDays;
  onDays: (days: OverviewDays) => void;
  metric: Metric;
  onMetric: (metric: Metric) => void;
  profitUnknown: number;
  loading: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);
  const [wrapRef, width] = useElementWidth<HTMLDivElement>(640);
  const compact = width < COMPACT_BELOW;
  const height = compact ? 220 : 260;
  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 120);
  const plotHeight = height - MARGIN.top - MARGIN.bottom;

  const config = METRICS.find((item) => item.key === metric) ?? METRICS[0];
  const points = series ?? [];
  const values = points.map((point) => metricValue(point, metric));
  const max = niceMax(Math.max(0, ...values));
  const step = points.length > 0 ? plotWidth / points.length : plotWidth;
  const barWidth = Math.min(step * 0.62, 44);
  const total = totalOf(points, metric);
  const show = (value: number) => (config.money ? formatPrice(value) : `${value} commande${value > 1 ? "s" : ""}`);
  const y = (value: number) => MARGIN.top + plotHeight - (Math.max(value, 0) / max) * plotHeight;
  const centerOf = (index: number) => MARGIN.left + step * (index + 0.5);
  const hovered = active !== null ? points[active] : null;
  const dayText = (date: string) => (days <= 7 && !compact ? shortDayLabel(date) : dayMonth(date));

  return (
    <section aria-labelledby="activite" className="card space-y-4 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id="activite" className="text-lg">
            Activité
          </h2>
          <p className="font-display text-2xl font-extrabold tabular-nums sm:text-3xl">{loading ? "…" : show(total)}</p>
          <p className="text-sm text-ink-muted">
            {config.label.toLowerCase()} sur {days} jours
          </p>
        </div>
        {/* En haut à droite : la période, et la liste déroulante qui change ce que le graphique montre. */}
        <div className="flex items-center gap-2">
          <div role="group" aria-label="Période" className="admin-seg">
            {([7, 30] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={days === option}
                onClick={() => {
                  setActive(null);
                  onDays(option);
                }}
              >
                {option} j
              </button>
            ))}
          </div>
          <label className="min-w-0 flex-1 sm:flex-none">
            <span className="sr-only">Ce que le graphique montre</span>
            <select className="admin-select w-full" value={metric} onChange={(event) => onMetric(event.target.value as Metric)}>
              {METRICS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div ref={wrapRef} className="relative" onPointerLeave={() => setActive(null)}>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${config.label} par jour sur ${days} jours : ${show(total)} en tout`}
          className="block max-w-full touch-manipulation select-none"
        >
          {axisTicks(max, !config.money).map((tick) => (
            <g key={tick}>
              <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} stroke="var(--admin-line)" strokeWidth={1} />
              <text x={MARGIN.left - 8} y={y(tick) + 4} textAnchor="end" fontSize={11} fill="var(--ink-muted)">
                {config.money ? shortAmount(tick) : tick}
              </text>
            </g>
          ))}
          {points.map((point, index) => {
            const value = values[index];
            const top = y(value);
            const isActive = active === index;
            const dimmed = active !== null && !isActive;
            // Sur 7 jours, un nom par jour ; sur 30 jours, un sur cinq, en finissant toujours par aujourd'hui.
            const labelled = (points.length - 1 - index) % labelEvery(days) === 0;
            return (
              <g key={point.date}>
                {value > 0 ? (
                  <rect
                    x={centerOf(index) - barWidth / 2}
                    y={top}
                    width={barWidth}
                    height={MARGIN.top + plotHeight - top}
                    rx={Math.min(4, barWidth / 2)}
                    fill="var(--blue)"
                    opacity={dimmed ? 0.35 : 1}
                    style={{ transition: "opacity 120ms" }}
                  />
                ) : (
                  // Un jour sans rien : un petit trait, pour que le jour reste lisible.
                  <rect x={centerOf(index) - barWidth / 2} y={MARGIN.top + plotHeight - 2} width={barWidth} height={2} rx={1} fill="var(--admin-line)" />
                )}
                {labelled ? (
                  <text x={centerOf(index)} y={height - 8} textAnchor="middle" fontSize={11} fill={isActive ? "var(--ink)" : "var(--ink-muted)"}>
                    {dayText(point.date)}
                  </text>
                ) : null}
                {/* La zone qui réagit : toute la hauteur de la colonne, pour qu'un jour sans barre se touche aussi. */}
                <rect
                  x={centerOf(index) - step / 2}
                  y={MARGIN.top}
                  width={step}
                  height={plotHeight}
                  fill="transparent"
                  tabIndex={0}
                  role="img"
                  aria-label={`${shortDayLabel(point.date)} : ${show(value)}`}
                  onPointerEnter={() => setActive(index)}
                  onClick={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                  style={{ outline: "none", cursor: "pointer" }}
                />
              </g>
            );
          })}
        </svg>

        {/* L'infobulle : au-dessus de la colonne, jamais plus près du bord que 16 % (elle sortirait de la carte). */}
        {hovered && active !== null ? (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-[var(--admin-line)] bg-surface px-3 py-2 text-sm shadow-lg"
            style={{ left: `${Math.min(84, Math.max(16, (centerOf(active) / width) * 100))}%` }}
          >
            <p className="font-semibold">{shortDayLabel(hovered.date)}</p>
            <p className="font-display font-bold tabular-nums">{show(metricValue(hovered, metric))}</p>
            {metric === "sales" ? <p className="text-xs text-ink-muted">{hovered.orders} commande(s)</p> : null}
          </div>
        ) : null}

        {!loading && total === 0 ? (
          <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-ink-muted">Rien sur cette période.</p>
        ) : null}
      </div>

      {metric === "profit" && profitUnknown > 0 ? (
        <p className="text-xs text-ink-muted">
          {profitUnknown} vente{profitUnknown > 1 ? "s" : ""} sans prix d&apos;achat connu n&apos;{profitUnknown > 1 ? "entrent" : "entre"} pas dans le bénéfice.
        </p>
      ) : null}

      <table className="sr-only">
        <caption>
          {config.label} par jour sur {days} jours
        </caption>
        <thead>
          <tr>
            <th scope="col">Jour</th>
            <th scope="col">{config.label}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <th scope="row">{shortDayLabel(point.date)}</th>
              <td>{show(metricValue(point, metric))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
