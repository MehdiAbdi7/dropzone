"use client";

import { useState } from "react";
import { swatchOf } from "@/config/colors";
import AddToCartButton from "@/features/cart/AddToCartButton";
import GiftList from "@/features/products/GiftList";
import { formatPrice } from "@/lib/format";
import type { ProductKind, Variant } from "@/types/api";
import { initialSelection, optionChoices, optionKeys, selectOption } from "./stock";

// Ce qui reste, écrit sur chaque puce. La première option compte tout le stock
// (« 3 en stock ») ; les suivantes comptent dans les choix d'avant (« 2 restants »).
function stockLabel(stock: number, first: boolean): string {
  if (stock === 0) {
    return "épuisé";
  }
  if (first) {
    return `${stock} en stock`;
  }
  return `${stock} restant${stock > 1 ? "s" : ""}`;
}

// Le choix d'un neuf : couleur, puis stockage… avec, sur chaque valeur, ce qui reste
// vraiment. Une valeur épuisée reste visible, barrée, et ne se clique pas.
export default function NewPicker({ variants, kind }: { variants: Variant[]; kind: ProductKind }) {
  const keys = optionKeys(variants, kind);
  const [selected, setSelected] = useState(() => initialSelection(variants, keys));
  const choices = optionChoices(variants, keys, selected);
  const current = variants.find((variant) => keys.every((key) => variant.options[key] === selected[key])) ?? variants[0];

  return (
    <div className="space-y-5">
      {choices.map(({ key, values }, index) => (
        <fieldset key={key}>
          <legend className="label">{key}</legend>
          <div className="flex flex-wrap gap-2">
            {values.map(({ value, stock }) => {
              const swatch = key === "Couleur" ? swatchOf(value) : null;
              return (
                <button
                  key={value}
                  type="button"
                  className="chip"
                  aria-pressed={selected[key] === value}
                  disabled={stock === 0}
                  onClick={() => setSelected(selectOption(variants, keys, selected, key, value))}
                >
                  {swatch ? (
                    <span
                      aria-hidden="true"
                      className="size-3.5 shrink-0 rounded-full border border-black/20"
                      style={{ background: swatch }}
                    />
                  ) : null}
                  {value}
                  <span className="text-xs font-normal opacity-80">{stockLabel(stock, index === 0)}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      {current ? (
        <div className="card space-y-4 p-5">
          <p className="font-display text-3xl font-bold">
            {formatPrice(current.price)} <span className="text-base font-semibold text-ink-muted">TTC</span>
          </p>
          <GiftList gifts={current.gifts} />
          <AddToCartButton variant={current} />
        </div>
      ) : null}
    </div>
  );
}
