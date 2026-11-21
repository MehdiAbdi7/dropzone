"use client";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { formatDate } from "@/lib/format";
import RepairSlipSection from "./RepairSlipSection";
import {
  canDecide,
  quoteRows,
  repairSlipAvailable,
  storePhones,
  trackPriceText,
  trackSkippedText,
  trackStateText,
  trackSteps,
  trackWarrantyText,
  type RepairTracking,
} from "./repairTrack";

const STEP_STYLE = {
  done: "border-blue-ink bg-blue-soft",
  current: "border-red bg-red-soft",
  exit: "border-red bg-red-soft",
  upcoming: "border-line text-ink-muted",
  skipped: "border-dashed border-line text-ink-muted",
} as const;

// Ce que le client voit de sa réparation : son appareil, les étapes avec leurs dates, le devis en détail (la
// main-d'œuvre à part des pièces) auquel il répond lui-même, les numéros du magasin, puis son bon de réparation.
// Jamais un coût, une note du technicien.
export default function RepairTrackView({
  tracking,
  onDecide,
  deciding,
  decisionError,
}: {
  tracking: RepairTracking;
  onDecide: (decision: "accept" | "refuse") => void;
  deciding: boolean;
  decisionError: string | null;
}) {
  const steps = trackSteps(tracking);
  const state = trackStateText(tracking.status);
  const rows = tracking.quote ? quoteRows(tracking.quote) : null;
  const deciders = canDecide(tracking);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl">Réparation R-{tracking.number}</h2>
        <p className="font-semibold">
          {tracking.deviceName}
          {tracking.deviceColor ? ` · ${tracking.deviceColor}` : ""}
        </p>
        <p className="text-sm text-ink-muted">{trackWarrantyText(tracking)}</p>
      </header>

      {state ? <p className="rounded-lg border border-blue-ink bg-blue-soft p-4 font-semibold">{state}</p> : null}

      <ol className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
        {steps.map((step) => (
          <li key={step.label} aria-current={step.state === "current" ? "step" : undefined} className={`rounded-lg border p-3 text-sm ${STEP_STYLE[step.state]}`}>
            <span className={`block font-semibold ${step.state === "skipped" ? "line-through" : ""}`}>{step.label}</span>
            <span className="block text-xs">{step.state === "skipped" ? trackSkippedText(tracking.underWarranty) : step.date ? formatDate(step.date) : "À venir"}</span>
          </li>
        ))}
      </ol>

      {rows ? (
        <section aria-labelledby="quote-title" className="card max-w-2xl space-y-3 p-5">
          <h3 id="quote-title" className="text-lg">
            {deciders ? "Votre devis" : "Détail de la réparation"}
          </h3>
          <ul className="divide-y divide-line">
            {rows.lines.map((line) => (
              // Une grille à deux colonnes : le prix reste à droite, même quand le nom est long.
              <li key={line.label} className="grid grid-cols-[1fr_auto] items-start gap-4 py-2">
                <div className="min-w-0">
                  <p className="font-semibold">{line.label}</p>
                  {line.detail ? <p className="text-xs text-ink-muted">{line.detail}</p> : null}
                </div>
                <p className="whitespace-nowrap text-right font-semibold tabular-nums">{line.price}</p>
              </li>
            ))}
          </ul>
          <p className="grid grid-cols-[1fr_auto] gap-4 border-t border-line pt-3 text-lg font-extrabold">
            <span>Total</span>
            <span className="whitespace-nowrap text-right tabular-nums">{rows.total}</span>
          </p>
          <p className="text-xs text-ink-muted">À payer au magasin, à la remise de l&apos;appareil.</p>

          {deciders ? (
            <div className="space-y-3 border-t border-line pt-4">
              <div className="flex flex-wrap gap-3">
                <ConfirmDialog
                  trigger={deciding ? "Envoi…" : "J'accepte le devis"}
                  triggerClassName="btn btn-primary"
                  confirmClassName="btn btn-primary"
                  title="Accepter le devis ?"
                  confirmLabel="Oui, j'accepte"
                  onConfirm={() => onDecide("accept")}
                >
                  Vous acceptez de payer {rows.total} au magasin, à la remise de votre appareil. La réparation commence tout de suite et vous
                  recevez votre bon de réparation.
                </ConfirmDialog>
                <ConfirmDialog
                  trigger="Je refuse le devis"
                  triggerClassName="btn btn-secondary"
                  title="Refuser le devis ?"
                  confirmLabel="Oui, je refuse"
                  onConfirm={() => onDecide("refuse")}
                >
                  Votre appareil ne sera pas réparé : vous pourrez venir le récupérer au magasin, sans frais.
                </ConfirmDialog>
              </div>
              {decisionError ? (
                <p role="alert" className="field-error">
                  {decisionError}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <p className="text-lg font-bold">{trackPriceText(tracking)}</p>

      <section aria-labelledby="store-phones-title" className="card max-w-2xl space-y-2 p-5">
        <h3 id="store-phones-title" className="text-lg">
          Une question ? Appelez le magasin
        </h3>
        <ul className="space-y-1">
          {storePhones().map((phone) => (
            <li key={phone.label} className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-ink-muted">{phone.label}</span>
              <a className="font-bold text-blue-ink underline" href={`tel:${phone.number.replace(/\s/g, "")}`}>
                {phone.number}
              </a>
            </li>
          ))}
        </ul>
      </section>

      {repairSlipAvailable(tracking) ? <RepairSlipSection tracking={tracking} /> : null}
    </div>
  );
}
