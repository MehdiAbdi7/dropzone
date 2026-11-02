// La santé de la batterie en jauge. La couleur aide, mais le chiffre est toujours
// écrit : l'information ne passe jamais par la couleur seule.
export default function BatteryGauge({ value }: { value: number }) {
  const color = value >= 85 ? "bg-blue-ink" : value >= 80 ? "bg-amber" : "bg-red";
  return (
    <div className="min-w-32">
      <p className="text-sm">
        <span className="text-ink-muted">Batterie </span>
        <span className="font-display font-bold tabular-nums">{value} %</span>
      </p>
      <div
        className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2"
        role="meter"
        aria-label="Santé de la batterie"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
