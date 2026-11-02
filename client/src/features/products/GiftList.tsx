import { formatOptions, formatPrice } from "@/lib/format";
import type { Gift } from "@/types/api";

// Les articles offerts d'une affaire : « Offert », avec le prix normal barré pour
// montrer la valeur du cadeau. Un cadeau épuisé est annoncé, pas caché.
export default function GiftList({ gifts }: { gifts: Gift[] }) {
  if (gifts.length === 0) {
    return null;
  }
  return (
    <div className="rounded-lg border border-red/40 bg-red-soft p-3">
      <p className="text-sm font-bold text-red">Affaire : offert avec cet appareil</p>
      <ul className="mt-2 space-y-1 text-sm">
        {gifts.map((gift) => (
          <li key={gift.sku} className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className={gift.available ? "" : "text-ink-muted line-through"}>
              {gift.quantity > 1 ? `${gift.quantity} × ` : ""}
              {gift.name}
              {Object.keys(gift.options).length > 0 ? ` (${formatOptions(gift.options)})` : ""}
            </span>
            {gift.available ? (
              <span>
                <s className="text-ink-muted">{formatPrice(gift.price * gift.quantity)}</s>{" "}
                <strong className="text-red">Offert</strong>
              </span>
            ) : (
              <span className="text-ink-muted">Épuisé</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
