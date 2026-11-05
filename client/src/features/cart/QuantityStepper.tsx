"use client";

// Le choix d'une quantité : « − n + » (05/11). Les boutons se grisent aux bornes : on ne
// descend pas sous 1, on ne monte pas au-delà de `max` (le stock réel, 10 au plus).
export default function QuantityStepper({
  value,
  max,
  onChange,
  label = "Quantité",
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  label?: string;
}) {
  const button =
    "flex size-9 items-center justify-center text-lg font-bold transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-35";
  return (
    <div role="group" aria-label={label} className="inline-flex items-center overflow-hidden rounded-full border border-line bg-surface">
      <button type="button" className={button} aria-label="Retirer un" disabled={value <= 1} onClick={() => onChange(value - 1)}>
        −
      </button>
      <output aria-live="polite" className="min-w-8 text-center font-display font-bold tabular-nums">
        {value}
      </output>
      <button type="button" className={button} aria-label="Ajouter un" disabled={value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}
