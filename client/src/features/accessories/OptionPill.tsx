import type { ReactNode } from "react";

// Une pastille de choix de la fenêtre d'un accessoire, la même partout (options, tailles,
// modèles) : choisie en bleu ; épuisée, barrée mais cliquable (la fenêtre dit « Rupture de
// stock ») ; impossible avec les choix déjà faits, grisée, barrée et pas cliquable.
export default function OptionPill({
  label,
  chosen,
  possible,
  soldOut,
  small = false,
  onClick,
}: {
  label: ReactNode;
  chosen: boolean;
  possible: boolean;
  soldOut: boolean;
  small?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={chosen}
      disabled={!possible}
      onClick={onClick}
      className={`border font-semibold tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        small ? "rounded-full px-3 py-1 text-xs" : "rounded-[var(--radius-field)] px-3 py-2 text-sm"
      } ${chosen ? "border-blue bg-blue-soft" : "border-line enabled:hover:border-blue-ink"} ${
        !possible || soldOut ? "text-ink-muted line-through" : ""
      }`}
    >
      {label}
    </button>
  );
}
