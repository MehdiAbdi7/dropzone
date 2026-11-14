import { CloseIcon } from "@/components/ui/icons";
import type { OrderStep, StepState } from "./orderSteps";

// La frise de la fenêtre d'une commande : une pastille par étape, reliées par une ligne.
// Aux couleurs de DropZone : bleu pour ce qui est fait, rouge pour l'étape où en est la commande
// (ou la sortie : annulée, retournée, expirée), gris pour ce qui reste.
// Chaque pastille est un bouton : on regarde une autre étape sans changer l'état de la commande.
const PILL: Record<StepState, string> = {
  done: "bg-blue text-on-brand",
  current: "bg-red text-on-red",
  upcoming: "border border-line bg-surface-2 text-ink-muted",
  exit: "bg-red text-on-red",
};

// La ligne qui arrive sur une pastille est pleine (bleue) quand l'étape est atteinte ; elle reste
// grise vers l'avenir et vers une sortie.
const LINE_REACHED: Record<StepState, boolean> = { done: true, current: true, upcoming: false, exit: false };

export default function OrderStepper({
  steps,
  selected,
  onSelect,
}: {
  steps: OrderStep[];
  selected: number | null;
  onSelect: (index: number) => void;
}) {
  return (
    <ol className="flex" aria-label="Étapes de la commande">
      {steps.map((step, index) => (
        <li key={step.status} className="relative flex min-w-0 flex-1 flex-col items-center gap-1.5">
          {index > 0 ? (
            <span
              aria-hidden="true"
              className={`absolute right-1/2 top-[15px] h-1 w-full ${LINE_REACHED[step.state] ? "bg-blue" : "bg-line"}`}
            />
          ) : null}
          <button
            type="button"
            onClick={() => onSelect(index)}
            aria-current={step.state === "current" ? "step" : undefined}
            aria-pressed={selected === index}
            aria-label={`${step.label}${step.state === "done" ? ", faite" : step.state === "current" ? ", étape actuelle" : step.state === "exit" ? ", sortie" : ", à venir"}`}
            className={`relative z-10 flex size-8 items-center justify-center rounded-full text-sm font-bold ring-4 ring-surface transition-transform ${PILL[step.state]} ${
              step.state === "current" || step.state === "exit" ? "scale-110" : ""
            } ${selected === index ? "outline outline-2 outline-offset-2 outline-ink" : ""}`}
          >
            {step.state === "exit" ? <CloseIcon /> : index + 1}
          </button>
          <span
            className={`px-0.5 text-center text-[11px] leading-tight sm:text-xs ${
              selected === index ? "font-bold text-ink" : step.state === "upcoming" ? "text-ink-muted" : "font-semibold text-ink"
            }`}
          >
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}
