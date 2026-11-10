"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";
import type { GiftOption } from "@/features/admin/api/productsApi";
import type { VariantDraft } from "./productDraft";

// Les articles offerts : pris dans les accessoires du catalogue (GET /admin/gift-options).
export default function GiftEditor({
  variant,
  giftOptions,
  onChange,
}: {
  variant: VariantDraft;
  giftOptions: GiftOption[];
  onChange: (gifts: VariantDraft["gifts"]) => void;
}) {
  const [choice, setChoice] = useState("");
  const labelOf = (id: number) => giftOptions.find((option) => option.id === id);
  const available = giftOptions.filter((option) => !variant.gifts.some((gift) => gift.giftVariantId === option.id));

  return (
    <div className="space-y-3">
      {variant.gifts.length === 0 ? <p className="text-sm text-ink-muted">Aucun article offert.</p> : null}
      <ul className="space-y-2">
        {variant.gifts.map((gift) => {
          const option = labelOf(gift.giftVariantId);
          return (
            <li key={gift.giftVariantId} className="flex flex-wrap items-center gap-3 text-sm">
              <span className="flex-1">
                {option ? `${option.label}, ${formatPrice(option.price)} (stock ${option.stock})` : `Article n° ${gift.giftVariantId}`}
              </span>
              <label className="flex items-center gap-2">
                Quantité
                <input
                  className="input min-h-9 w-16 py-1"
                  inputMode="numeric"
                  value={gift.quantity}
                  onChange={(event) =>
                    onChange(
                      variant.gifts.map((g) =>
                        g.giftVariantId === gift.giftVariantId
                          ? { ...g, quantity: Math.max(1, Math.min(5, Number(event.target.value) || 1)) }
                          : g,
                      ),
                    )
                  }
                />
              </label>
              <button
                type="button"
                className="text-red underline"
                onClick={() => onChange(variant.gifts.filter((g) => g.giftVariantId !== gift.giftVariantId))}
              >
                Retirer
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex max-w-xl gap-2">
        <label htmlFor={`${variant.key}-gift`} className="sr-only">
          Article à offrir
        </label>
        <select id={`${variant.key}-gift`} className="input" value={choice} onChange={(event) => setChoice(event.target.value)}>
          <option value="">Choisir un accessoire à offrir…</option>
          {available.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label} ({formatPrice(option.price)}, stock {option.stock})
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          disabled={!choice}
          onClick={() => {
            onChange([...variant.gifts, { giftVariantId: Number(choice), quantity: 1 }]);
            setChoice("");
          }}
        >
          Offrir
        </button>
      </div>
    </div>
  );
}
