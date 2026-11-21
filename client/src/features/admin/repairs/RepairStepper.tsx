import { CloseIcon } from "@/components/ui/icons";
import type { RepairStep, RepairStepState } from "./repairsView";

// La frise d'une fiche : une pastille par étape, reliées par une ligne. Aux couleurs de DropZone, comme la frise
// des commandes : bleu pour ce qui est fait, rouge pour l'étape en cours (ou la sortie « À rendre sans
// réparation »), gris pour ce qui reste, gris barré pour l'étape sautée (pas de devis sous garantie).
// Chaque pastille est un bouton (depuis le 21/11) : on regarde une autre étape sans changer l'état de la fiche.
const PILL: Record<RepairStepState, string> = {
  done: "bg-blue text-on-brand",
  current: "bg-red text-on-red",
  upcoming: "border border-line bg-surface-2 text-ink-muted",
  skipped: "border border-dashed border-line bg-surface text-ink-muted",
  exit: "bg-red text-on-red",
};

const STATE_TEXT: Record<RepairStepState, string> = {
  done: ", faite",
  current: ", étape actuelle",
  upcoming: ", à venir",
  skipped: ", sautée",
  exit: ", sortie",
};

// La ligne qui arrive sur une pastille est pleine (bleue) quand l'étape est atteinte.
const LINE_REACHED: Record<RepairStepState, boolean> = { done: true, current: true, upcoming: false, skipped: true, exit: true };

export default function RepairStepper({
  steps,
  selected,
  onSelect,
}: {
  steps: RepairStep[];
  // L'étape regardée (null : aucune, la fenêtre montre les détails).
  selected: number | null;
  onSelect: (index: number) => void;
}) {
  return (
    <ol className="flex" aria-label="Étapes de la réparation">
      {steps.map((step, index) => (
        <li key={step.status} className="relative flex min-w-0 flex-1 flex-col items-center gap-1.5">
          {index > 0 ? (
            <span aria-hidden="true" className={`absolute right-1/2 top-[15px] h-1 w-full ${LINE_REACHED[step.state] ? "bg-blue" : "bg-line"}`} />
          ) : null}
          <button
            type="button"
            onClick={() => onSelect(index)}
            aria-current={step.state === "current" ? "step" : undefined}
            aria-pressed={selected === index}
            aria-label={`${step.label}${STATE_TEXT[step.state]}`}
            className={`relative z-10 flex size-8 items-center justify-center rounded-full text-sm font-bold ring-4 ring-surface transition-transform ${PILL[step.state]} ${
              step.state === "current" || step.state === "exit" ? "scale-110" : ""
            } ${selected === index ? "outline outline-2 outline-offset-2 outline-ink" : ""}`}
          >
            {step.state === "exit" ? <CloseIcon /> : index + 1}
          </button>
          <span
            className={`px-0.5 text-center text-[11px] leading-tight sm:text-xs ${
              selected === index ? "font-bold text-ink" : step.state === "upcoming" ? "text-ink-muted" : step.state === "skipped" ? "text-ink-muted line-through" : "font-semibold text-ink"
            }`}
          >
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}
