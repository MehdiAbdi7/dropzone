import type { ReactNode } from "react";
import { formatOptions, formatPrice } from "@/lib/format";
import type { Variant } from "@/types/api";
import BatteryGauge from "./BatteryGauge";
import GiftList from "./GiftList";

// L'argument du vendeur, quand un défaut se cache facilement.
function defectTip(defect: string): string | null {
  if (/arrière|cadre|coins/i.test(defect)) {
    return "invisible avec une coque";
  }
  if (/écran/i.test(defect)) {
    return "invisible avec un verre trempé";
  }
  return null;
}

// La fiche d'état d'un reconditionné : la note, la batterie, puis les trois familles.
// Les limitations passent en premier et en rouge : c'est ce qui empêche un usage.
export default function ConditionReport({ variant, action }: { variant: Variant; action?: ReactNode }) {
  return (
    <article className="card neon-edge grid gap-4 p-5 pl-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-5">
          <p className="flex flex-col items-center leading-none" aria-label={`Note d'état ${variant.grade} sur 10`}>
            <span className="font-display text-4xl font-bold tabular-nums">
              {variant.grade}
              <span className="text-lg text-ink-muted">/10</span>
            </span>
            <span className="mt-1 text-xs text-ink-muted">état</span>
          </p>
          <div className="space-y-2">
            {Object.keys(variant.options).length > 0 ? (
              <p className="font-semibold">{formatOptions(variant.options)}</p>
            ) : null}
            {variant.batteryHealth !== null ? <BatteryGauge value={variant.batteryHealth} /> : null}
          </div>
        </div>
        <p className="font-display text-2xl font-bold">{formatPrice(variant.price)}</p>
      </header>

      {variant.limitations.length > 0 ? (
        <div role="note" className="rounded-lg border border-red bg-red-soft p-3">
          <p className="text-sm font-bold text-red">
            {variant.limitations.length > 1 ? "Limitations de cet appareil" : "Limitation de cet appareil"}
          </p>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {variant.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-blue-ink">Pièces remplacées</dt>
          <dd className="mt-0.5">
            {variant.replacedParts.length > 0 ? variant.replacedParts.join(", ") : "Aucune, tout est d'origine"}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-amber">Défauts visibles</dt>
          <dd className="mt-0.5">
            {variant.defects.length > 0 ? (
              <ul>
                {variant.defects.map((defect) => {
                  const tip = defectTip(defect);
                  return (
                    <li key={defect}>
                      {defect}
                      {tip ? <span className="text-ink-muted"> ({tip})</span> : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              "Aucun"
            )}
          </dd>
        </div>
      </dl>

      <GiftList gifts={variant.gifts} />
      {action}
    </article>
  );
}
