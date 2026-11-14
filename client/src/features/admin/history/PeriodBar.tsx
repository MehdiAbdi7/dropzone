"use client";

import { periodLabel, shiftPeriod, type PeriodKind } from "@/lib/period";

const KIND_TABS: { kind: PeriodKind; label: string }[] = [
  { kind: "day", label: "Jour" },
  { kind: "month", label: "Mois" },
  { kind: "year", label: "Année" },
];

type Props = {
  kind: PeriodKind;
  anchor: string;
  today: string;
  onChange: (next: { kind: PeriodKind; anchor: string }) => void;
};

// Le choix de la période de l'Historique : jour, mois ou année, avec les flèches pour avancer et
// reculer et un champ date pour aller directement à un jour.
export default function PeriodBar({ kind, anchor, today, onChange }: Props) {
  return (
    <div className="card flex flex-wrap items-center gap-3 p-3">
      {/* Des boutons à bascule (aria-pressed), pas des onglets : il n'y a pas de panneau par onglet. */}
      <div role="group" aria-label="Durée de la période" className="flex gap-2">
        {KIND_TABS.map((tab) => (
          <button
            key={tab.kind}
            type="button"
            aria-pressed={kind === tab.kind}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              kind === tab.kind ? "bg-blue text-on-brand" : "bg-surface-2 text-ink hover:text-blue-ink"
            }`}
            onClick={() => onChange({ kind: tab.kind, anchor })}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sur téléphone, les flèches et le nom de la période ont leur propre ligne (sinon le nom
          est écrasé entre elles). */}
      <div className="flex min-w-0 basis-full items-center justify-between gap-2 sm:flex-1 sm:basis-auto sm:justify-center">
        <button
          type="button"
          className="btn btn-secondary btn-small"
          aria-label="Période précédente"
          onClick={() => onChange({ kind, anchor: shiftPeriod(kind, anchor, -1) })}
        >
          ←
        </button>
        <h2 className="min-w-0 flex-1 text-center font-display text-lg font-bold sm:flex-none" aria-live="polite">
          {periodLabel(kind, anchor)}
        </h2>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          aria-label="Période suivante"
          onClick={() => onChange({ kind, anchor: shiftPeriod(kind, anchor, 1) })}
        >
          →
        </button>
      </div>

      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor="history-day">
          Aller à un jour
        </label>
        <input
          id="history-day"
          className="input w-auto"
          type="date"
          value={anchor}
          max={today}
          onChange={(event) => event.target.value && onChange({ kind, anchor: event.target.value })}
        />
        <button type="button" className="btn btn-secondary btn-small" onClick={() => onChange({ kind, anchor: today })}>
          Aujourd&apos;hui
        </button>
      </div>
    </div>
  );
}
