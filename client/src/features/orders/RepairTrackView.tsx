import { warrantyLabel } from "@/features/admin/repairs/repairsView";
import { formatDate } from "@/lib/format";
import { trackPriceText, trackStateText, trackSteps, type RepairTracking } from "./repairTrack";

const STEP_STYLE = {
  done: "border-blue-ink bg-blue-soft",
  current: "border-red bg-red-soft",
  exit: "border-red bg-red-soft",
  upcoming: "border-line text-ink-muted",
  skipped: "border-dashed border-line text-ink-muted",
} as const;

// Ce que le client voit de sa réparation : son appareil, les étapes avec leurs dates, ce qu'il doit payer.
// Jamais un coût, une note du technicien, ni le détail des pièces.
export default function RepairTrackView({ tracking }: { tracking: RepairTracking }) {
  const steps = trackSteps(tracking);
  const state = trackStateText(tracking.status);
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl">Réparation R-{tracking.number}</h2>
        <p className="font-semibold">
          {tracking.deviceName}
          {tracking.deviceColor ? ` · ${tracking.deviceColor}` : ""}
        </p>
        <p className="text-sm text-ink-muted">
          {warrantyLabel({ underWarranty: tracking.underWarranty, warrantyEndsAt: tracking.warrantyEndsAt, warrantyForcedOff: false })}
        </p>
      </header>

      {state ? <p className="rounded-lg border border-blue-ink bg-blue-soft p-4 font-semibold">{state}</p> : null}

      <ol className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
        {steps.map((step) => (
          <li key={step.label} aria-current={step.state === "current" ? "step" : undefined} className={`rounded-lg border p-3 text-sm ${STEP_STYLE[step.state]}`}>
            <span className={`block font-semibold ${step.state === "skipped" ? "line-through" : ""}`}>{step.label}</span>
            <span className="block text-xs">{step.state === "skipped" ? "Sans devis (sous garantie)" : step.date ? formatDate(step.date) : "À venir"}</span>
          </li>
        ))}
      </ol>

      <p className="text-lg font-bold">{trackPriceText(tracking)}</p>
    </div>
  );
}
