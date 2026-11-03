import { swatchOf } from "@/config/colors";
import AddToCartButton from "@/features/cart/AddToCartButton";
import BatteryGauge from "@/features/products/BatteryGauge";
import { defectTip } from "@/features/products/ConditionReport";
import GiftList from "@/features/products/GiftList";
import { formatPrice } from "@/lib/format";
import type { ProductKind, Variant } from "@/types/api";
import DeviceDiagram from "./DeviceDiagram";
import { zonesOf } from "./diagramZones";

// La carte d'une affaire, la « radiographie » : le prix, la couleur et la boîte, les
// détails du gérant, les limitations en rouge en haut (ce qui empêche un usage), le
// schéma avec sa légende (chaque pièce changée, d'origine ou compatible), l'état et la
// batterie, les articles offerts, puis l'ajout au panier de cet appareil précis.
export default function RefurbishedCard({ variant, kind }: { variant: Variant; kind: ProductKind }) {
  const { Couleur: color, ...otherOptions } = variant.options;
  const swatch = color ? swatchOf(color) : null;
  const zones = zonesOf(variant, kind);
  const diagramKind = kind === "laptop" || kind === "watch" ? kind : "phone";
  const pristine = variant.replacedParts.length === 0 && variant.defects.length === 0;

  return (
    <article className="card neon-edge grid gap-4 p-5 pl-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-display text-2xl font-bold">
            {formatPrice(variant.price)} <span className="text-sm font-semibold text-ink-muted">TTC</span>
          </p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {color ? (
              <span className="inline-flex items-center gap-1.5 font-semibold">
                {swatch ? (
                  <span aria-hidden="true" className="size-3.5 rounded-full border border-black/20" style={{ background: swatch }} />
                ) : null}
                {color}
              </span>
            ) : null}
            {Object.values(otherOptions).map((value) => (
              <span key={value} className="text-ink-muted">
                · {value}
              </span>
            ))}
          </p>
          <p className="text-sm font-semibold">{variant.withBox ? "Avec sa boîte d'origine" : "Sans boîte"}</p>
        </div>
        <p className="flex flex-col items-center leading-none" aria-label={`État ${variant.grade} sur 10`}>
          <span className="font-display text-3xl font-bold tabular-nums">
            {variant.grade}
            <span className="text-base text-ink-muted">/10</span>
          </span>
          <span className="mt-1 text-xs text-ink-muted">état</span>
        </p>
      </header>

      {/* Les détails du gérant (« Comme neuf, vendu avec sa boîte d'origine »). */}
      {variant.details ? <p className="break-words font-semibold">{variant.details}</p> : null}

      {variant.limitations.length > 0 ? (
        <div role="note" className="rounded-lg border border-red bg-red-soft p-3 text-sm">
          <p className="font-bold text-red">
            {variant.limitations.length > 1 ? "Limitations de cet appareil" : "Limitation de cet appareil"}
          </p>
          <ul className="mt-1 list-disc pl-5">
            {variant.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
        <DeviceDiagram kind={diagramKind} replaced={zones.replaced} defects={zones.defects} />
        <div className="space-y-3 text-sm">
          {pristine ? (
            <p className="font-semibold">Aucune pièce changée, aucun défaut.</p>
          ) : (
            <ul className="space-y-1.5">
              {variant.replacedParts.map((part) => (
                <li key={part} className="flex items-baseline gap-2">
                  <span aria-hidden="true" className="inline-block size-3 shrink-0 rounded-sm border-2 border-blue bg-blue-soft" />
                  <span>
                    {part}{" "}
                    <span className="text-ink-muted">
                      : pièce changée, {variant.compatibleParts.includes(part) ? "compatible" : "d'origine"}
                    </span>
                  </span>
                </li>
              ))}
              {variant.defects.map((defect) => {
                const tip = defectTip(defect);
                return (
                  <li key={defect} className="flex items-baseline gap-2">
                    <span aria-hidden="true" className="inline-block size-3 shrink-0 rounded-full bg-red" />
                    <span>
                      {defect}
                      {tip ? <span className="text-ink-muted"> ({tip})</span> : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {variant.batteryHealth !== null ? <BatteryGauge value={variant.batteryHealth} /> : null}
        </div>
      </div>

      <GiftList gifts={variant.gifts} />
      <AddToCartButton variant={variant} />
    </article>
  );
}
