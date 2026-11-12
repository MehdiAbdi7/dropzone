"use client";

import { useState } from "react";
import { matchChoices } from "@/features/admin/products/choiceSearch";
import type { Variant } from "@/types/api";
import { isPossible, phonesOf } from "./options";

const SIZE = "Taille de l'écran";

// Le choix de la taille d'un verre incassable (refonte du 12/11) : des pastilles, et pour le
// client qui ne connaît pas sa taille, la recherche de son téléphone parmi les compatibles des
// variantes (réglés dans le back-office). Sous les pastilles, les téléphones de la taille choisie.
export default function SizePicker({
  variants,
  values,
  chosen,
  onChoose,
}: {
  variants: Variant[];
  values: string[];
  chosen: Record<string, string>;
  onChoose: (size: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<string | null>(null);
  const phones = phonesOf(variants);
  const matches = query.trim() ? matchChoices(phones.map((phone) => phone.name), query, 6) : [];
  const size = chosen[SIZE];
  const compatible = variants.find((variant) => variant.options[SIZE] === size)?.compatibleModels ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {values.map((value) => {
          const variant = variants.find((one) => one.options[SIZE] === value);
          const off = !isPossible(variants, SIZE, value, chosen) || (variant?.stock ?? 0) === 0;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={size === value}
              disabled={!isPossible(variants, SIZE, value, chosen)}
              onClick={() => {
                onChoose(value);
                setFound(null);
              }}
              className={`rounded-[var(--radius-field)] border px-3 py-2 text-sm font-semibold tabular-nums transition-colors ${
                size === value ? "border-blue bg-blue-soft" : "border-line hover:border-blue-ink"
              } ${off ? "text-ink-muted line-through" : ""}`}
            >
              {value.replace(" pouces", "″")}
            </button>
          );
        })}
      </div>
      {size && compatible.length > 0 ? (
        <p className="text-xs text-ink-muted">
          <span className="font-semibold text-ink">Compatible avec :</span> {compatible.map((model) => model.name).join(", ")}
        </p>
      ) : null}
      <div className="space-y-2">
        <label htmlFor="size-phone" className="block text-xs text-ink-muted">
          Tu ne connais pas ta taille ? Tape le nom de ton téléphone.
        </label>
        <input
          id="size-phone"
          type="search"
          autoComplete="off"
          className="input w-full"
          placeholder="ex. iPhone 15, Galaxy S24"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query.trim() && matches.length === 0 ? (
          <p className="text-sm text-ink-muted">Pas de verre pour ce téléphone dans cette qualité.</p>
        ) : null}
        {matches.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {matches.map((name) => {
              const phone = phones.find((one) => one.name === name)!;
              return (
                <li key={phone.slug}>
                  <button
                    type="button"
                    className="rounded-full border border-line bg-surface-2 px-3 py-1 text-xs hover:border-blue-ink"
                    onClick={() => {
                      onChoose(phone.size);
                      setFound(phone.name);
                      setQuery("");
                    }}
                  >
                    {phone.name} <span className="text-ink-muted">{phone.size.replace(" pouces", "″")}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
        {found ? (
          <p role="status" className="text-sm font-semibold text-blue-ink">
            Compatible avec ton {found} : {size}.
          </p>
        ) : null}
      </div>
    </div>
  );
}
