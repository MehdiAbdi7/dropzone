"use client";

import { useEffect, useState } from "react";
import { type Palette, swatchOf } from "@/config/colors";
import AddToCartButton from "@/features/cart/AddToCartButton";
import GiftList from "@/features/products/GiftList";
import { formatPrice } from "@/lib/format";
import type { ProductKind, Variant } from "@/types/api";
import { dealFacts } from "./dealLabels";
import {
  initialSelection,
  ORIGIN_KEY,
  optionChoices,
  optionKeys,
  requestedSelection,
  selectOption,
  withOriginOption,
} from "./stock";

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
// vraiment. Une valeur épuisée reste visible, barrée, et ne se clique pas. La palette
// (teintes réglées dans Listes) donne la pastille de chaque couleur. `colorChosen` : la
// couleur a été choisie à l'étape Couleur, les variantes sont déjà les siennes.
export default function NewPicker({
  variants,
  kind,
  palette,
  colorChosen = false,
  requested,
  initialSku,
  onCurrent,
}: {
  variants: Variant[];
  kind: ProductKind;
  palette: Palette;
  colorChosen?: boolean;
  // Les options demandées par l'adresse (la colonne d'une affiche d'accessoire, 12/11).
  requested?: Record<string, string | undefined>;
  // Le SKU visé par l'adresse (26/11, lien d'une story) : ses options sont choisies au départ.
  initialSku?: string;
  // Prévenu de la variante choisie, au départ puis à chaque choix : la visionneuse montre ses photos et sa vidéo.
  onCurrent?: (variant: Variant) => void;
}) {
  // Deux neufs identiques mais d'origines différentes : l'origine se choisit, en dernier.
  const pickable = withOriginOption(variants);
  const keys = [
    ...optionKeys(variants, kind, colorChosen ? "Couleur" : undefined),
    ...(pickable === variants ? [] : [ORIGIN_KEY]),
  ];
  // Les options de la variante visée (même rang dans `pickable` et dans `variants`), l'origine comprise.
  const wantedAt = initialSku ? variants.findIndex((variant) => variant.sku === initialSku) : -1;
  const start = requested ?? (wantedAt >= 0 ? pickable[wantedAt].options : undefined);
  const [selected, setSelected] = useState(
    () => (start ? requestedSelection(pickable, keys, start) : null) ?? initialSelection(pickable, keys),
  );
  const choices = optionChoices(pickable, keys, selected);
  // La variante d'origine (sans l'option ajoutée) part au panier.
  const index = pickable.findIndex((variant) => keys.every((key) => variant.options[key] === selected[key]));
  const current = variants[Math.max(index, 0)];
  // Dépend du SKU seulement : la fonction reçue change à chaque rendu du parent, la relancer bouclerait.
  useEffect(() => {
    onCurrent?.(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.sku]);

  return (
    <div className="space-y-5">
      {choices.map(({ key, values }, index) => (
        <fieldset key={key}>
          <legend className="label">{key}</legend>
          <div className="flex flex-wrap gap-2">
            {values.map(({ value, stock }) => {
              const swatch = key === "Couleur" ? swatchOf(value, palette) : null;
              return (
                <button
                  key={value}
                  type="button"
                  className="chip"
                  aria-pressed={selected[key] === value}
                  disabled={stock === 0}
                  onClick={() => setSelected(selectOption(pickable, keys, selected, key, value))}
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
          {/* La garantie de l'appareil choisi, son origine et la référence du magasin. */}
          {dealFacts(current).length > 0 ? (
            <p className="text-sm font-semibold">{dealFacts(current).join(" · ")}</p>
          ) : null}
          <GiftList gifts={current.gifts} />
          <AddToCartButton variant={current} />
        </div>
      ) : null}
    </div>
  );
}
