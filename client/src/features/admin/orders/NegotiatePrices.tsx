"use client";

import { reductionText } from "@/features/admin/sales/ticket";
import { formatPrice } from "@/lib/format";
import { negotiationState, type NegotiableItem } from "./negotiation";

// Négocier le prix de chaque article avant de valider un retrait ou de confirmer une livraison
// (16/11, lot 3). Repliée par défaut : le cas courant (pas de négociation) n'est pas ralenti. Les
// prix saisis vivent dans la page (`prices`), pour que le bouton d'action les envoie et affiche le
// nouveau total. Les cadeaux ne se négocient pas : absents.
export default function NegotiatePrices({
  items,
  prices,
  onPrice,
  shippingFee,
}: {
  items: NegotiableItem[];
  prices: Record<number, number>;
  onPrice: (id: number, value: number) => void;
  shippingFee: number;
}) {
  const lines = items.filter((item) => !item.isGift);
  const state = negotiationState(items, prices, shippingFee);
  return (
    <details className="w-full rounded-lg border border-line p-3" open={state.toSend.length > 0 || undefined}>
      <summary className="cursor-pointer font-semibold">Négocier les prix</summary>
      <div className="mt-3 space-y-3">
        {lines.map((item) => {
          const value = item.id in prices ? prices[item.id] : item.unitPrice;
          const reduction = reductionText({ listPrice: item.listPrice ?? item.unitPrice, unitPrice: value });
          return (
            <div key={item.id} className="grid gap-2 sm:grid-cols-[1fr_11rem] sm:items-end">
              <p className="font-semibold">
                {item.quantity} × {item.name}
                {reduction ? <span className="block text-sm font-normal text-ink-muted">{reduction}</span> : null}
              </p>
              <label className="block text-sm font-semibold">
                <span className="label">Prix accordé (DA)</span>
                <input
                  className="input"
                  inputMode="numeric"
                  value={Number.isNaN(value) ? "" : value}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, "");
                    onPrice(item.id, digits === "" ? Number.NaN : Number(digits));
                  }}
                />
              </label>
            </div>
          );
        })}
        {state.problem ? (
          <p role="alert" className="field-error">
            {state.problem}
          </p>
        ) : (
          <p className="text-sm text-ink-muted" aria-live="polite">
            Nouveau total : <strong className="tabular-nums">{formatPrice(state.total)}</strong>
            {shippingFee > 0 ? ` (livraison ${formatPrice(shippingFee)} comprise)` : ""}
          </p>
        )}
      </div>
    </details>
  );
}
