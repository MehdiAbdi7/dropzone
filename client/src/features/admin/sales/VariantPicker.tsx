"use client";

import { useState } from "react";
import { CONDITION_LABELS } from "@/config/catalog";
import { useSearchVariantsQuery } from "@/features/admin/api/salesApi";
import { formatOptions, formatPrice } from "@/lib/format";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import type { VariantHit } from "./ticket";

// Le sélecteur de variantes du comptoir (16/11, lot 3) : on tape un morceau du nom ou un SKU, on
// choisit l'appareil exact dans la liste. N'offre que ce qui est publié et en stock. Sert la page
// Vente et la fenêtre « Modifier » d'une commande.
export default function VariantPicker({
  onPick,
  disabledSkus = [],
  label = "Chercher un appareil",
}: {
  onPick: (hit: VariantHit) => void;
  // Les SKU qu'on ne peut pas (re)choisir ici : leur bouton est grisé avec la raison.
  disabledSkus?: string[];
  label?: string;
}) {
  const [text, setText] = useState("");
  // La recherche attend une pause dans la saisie : chaque touche relancerait la requête.
  const search = useDebouncedValue(text.trim());
  const { data, isFetching, isError } = useSearchVariantsQuery(search, { skip: search.length < 2 });

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="label">{label}</span>
        <input
          className="input"
          type="search"
          autoComplete="off"
          placeholder="iPhone, Galaxy, SKU…"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>

      <div aria-live="polite" aria-busy={isFetching}>
        {isError ? (
          <p role="alert" className="field-error">
            La recherche ne répond pas, réessayez.
          </p>
        ) : search.length < 2 ? (
          <p className="text-sm text-ink-muted">Tapez au moins 2 caractères.</p>
        ) : data && data.length === 0 && !isFetching ? (
          <p className="text-sm text-ink-muted">Aucun appareil en stock pour cette recherche.</p>
        ) : null}
        <ul className="space-y-2">
          {data?.map((hit) => {
            const disabled = disabledSkus.includes(hit.sku);
            return (
              <li key={hit.sku}>
                <button
                  type="button"
                  className="card flex w-full items-center justify-between gap-3 p-3 text-left disabled:opacity-50"
                  disabled={disabled}
                  onClick={() => onPick(hit)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{hit.productName}</span>
                    <span className="block text-sm text-ink-muted">
                      {CONDITION_LABELS[hit.condition]}
                      {Object.keys(hit.options).length ? ` · ${formatOptions(hit.options)}` : ""}
                    </span>
                    <span className="block text-xs text-ink-muted">
                      {hit.sku} · {hit.stock} en stock
                      {disabled ? " · déjà dans la commande" : ""}
                    </span>
                  </span>
                  <span className="shrink-0 font-display font-bold tabular-nums">{formatPrice(hit.price)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
