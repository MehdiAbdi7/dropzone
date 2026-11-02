"use client";

import { useState } from "react";
import Field from "@/components/ui/Field";
import { FAMILIES, OPTION_FIELDS } from "@/config/catalog";
import { formatPrice } from "@/lib/format";
import type { ProductKind } from "@/types/api";
import type { GiftOption } from "../adminApi";
import ChoicePicker from "./ChoicePicker";
import type { VariantDraft } from "./productDraft";

type Props = {
  variant: VariantDraft;
  index: number;
  kind: ProductKind;
  canBeRefurbished: boolean;
  giftOptions: GiftOption[];
  onChange: (variant: VariantDraft) => void;
  onRemove: () => void;
  onSuggestSku: () => void;
};

// Une variante du formulaire : neuf ou reconditionné, ses options à cocher, son
// prix et son stock, la fiche d'état d'un reconditionné, et ses articles offerts.
export default function VariantEditor({
  variant,
  index,
  kind,
  canBeRefurbished,
  giftOptions,
  onChange,
  onRemove,
  onSuggestSku,
}: Props) {
  const set = (patch: Partial<VariantDraft>) => onChange({ ...variant, ...patch });
  const id = (name: string) => `${variant.key}-${name}`;
  const refurbished = variant.condition === "refurbished";

  return (
    <fieldset className={`card space-y-5 p-5 ${refurbished ? "neon-edge pl-6" : ""}`}>
      <legend className="sr-only">Variante {index + 1}</legend>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-lg font-bold">
          Variante {index + 1}
          {variant.id ? null : <span className="ml-2 text-sm font-semibold text-blue-ink">nouvelle</span>}
        </p>
        <button type="button" className="btn btn-danger btn-small" onClick={onRemove}>
          Retirer la variante
        </button>
      </div>

      {canBeRefurbished ? (
        <fieldset>
          <legend className="label">État</legend>
          <div className="flex gap-2">
            {(["new", "refurbished"] as const).map((condition) => (
              <button
                key={condition}
                type="button"
                className="chip"
                aria-pressed={variant.condition === condition}
                onClick={() => set({ condition, stock: condition === "refurbished" ? "1" : variant.stock })}
              >
                {condition === "new" ? "Neuf" : "Reconditionné"}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        {OPTION_FIELDS[kind].map((field) => (
          <ChoicePicker
            key={field.key}
            group={field.group}
            label={field.key}
            value={variant.options[field.key] ?? ""}
            onChange={(value) => set({ options: { ...variant.options, [field.key]: value } })}
          />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field id={id("price")} label="Prix TTC (DA)">
          <input
            id={id("price")}
            className="input"
            inputMode="numeric"
            value={variant.price}
            onChange={(event) => set({ price: event.target.value.replace(/\D/g, "") })}
          />
        </Field>
        {refurbished ? (
          <div>
            <p className="label">Disponibilité</p>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-5"
                checked={variant.stock === "1"}
                onChange={(event) => set({ stock: event.target.checked ? "1" : "0" })}
              />
              En stock (appareil unique)
            </label>
          </div>
        ) : (
          <Field id={id("stock")} label="Stock">
            <input
              id={id("stock")}
              className="input"
              inputMode="numeric"
              value={variant.stock}
              onChange={(event) => set({ stock: event.target.value.replace(/\D/g, "") })}
            />
          </Field>
        )}
        <Field id={id("sku")} label="Référence (SKU)">
          <div className="flex gap-2">
            <input
              id={id("sku")}
              className="input uppercase"
              value={variant.sku}
              onChange={(event) => set({ sku: event.target.value.toUpperCase() })}
            />
            <button type="button" className="btn btn-secondary btn-small" onClick={onSuggestSku}>
              Proposer
            </button>
          </div>
        </Field>
      </div>

      {refurbished ? (
        <div className="space-y-5 border-t border-line pt-5">
          <p className="font-display font-bold">Fiche d&apos;état</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={id("grade")} label="Note d'état (sur 10)">
              <select id={id("grade")} className="input" value={variant.grade} onChange={(event) => set({ grade: event.target.value })}>
                <option value="">Choisir…</option>
                {Array.from({ length: 10 }, (_, i) => 10 - i).map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}/10
                  </option>
                ))}
              </select>
            </Field>
            <Field id={id("battery")} label="Santé de la batterie (%)">
              <input
                id={id("battery")}
                className="input"
                inputMode="numeric"
                value={variant.batteryHealth}
                onChange={(event) => set({ batteryHealth: event.target.value.replace(/\D/g, "").slice(0, 3) })}
              />
            </Field>
          </div>
          {FAMILIES.map((family) => (
            <ChoicePicker
              key={family.field}
              multiple
              group={family.group}
              label={family.label}
              value={variant[family.field]}
              onChange={(values) => set({ [family.field]: values })}
            />
          ))}
        </div>
      ) : null}

      <GiftEditor variant={variant} giftOptions={giftOptions} onChange={(gifts) => set({ gifts })} />
    </fieldset>
  );
}

// Les articles offerts : pris dans les accessoires du catalogue (GET /admin/gift-options).
function GiftEditor({
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
    <div className="space-y-3 border-t border-line pt-5">
      <p className="font-display font-bold">Affaire : articles offerts</p>
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
