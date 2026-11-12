"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ProductImage from "@/components/ui/ProductImage";
import AddToCartButton from "@/features/cart/AddToCartButton";
import { matchChoices } from "@/features/admin/products/choiceSearch";
import { formatPrice } from "@/lib/format";
import type { Options, ProductDetail, Variant } from "@/types/api";
import { useAccessoryDetailQuery } from "./accessoriesApi";
import { findVariant, isPossible } from "./options";
import SizePicker from "./SizePicker";

const SIZE = "Taille de l'écran";
const MODEL = "Modèle";

// La fenêtre d'achat d'un accessoire (refonte du 12/11) : on choisit chaque option, puis on
// ajoute au panier sans quitter la page Accessoires. En bas de l'écran sur téléphone, au centre
// à partir de 640 px, comme la fenêtre du panier. <dialog> natif : fond, focus et Échap gérés.
export default function AccessoryDialog({ slug, onClose }: { slug: string | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { data: product, isError, refetch } = useAccessoryDetailQuery(slug ?? "", { skip: !slug });

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (slug && !element.open) element.showModal();
    if (!slug && element.open) element.close();
  }, [slug]);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="accessory-dialog-title"
      className="mx-auto mt-auto mb-0 max-h-[94dvh] w-full max-w-3xl overflow-hidden rounded-t-3xl border border-line bg-surface p-0 text-ink backdrop:bg-black/60 backdrop:backdrop-blur-[2px] sm:my-auto sm:max-h-[90dvh] sm:rounded-3xl"
    >
      <div className="relative max-h-[inherit] overflow-y-auto">
        <button type="button" className="icon-btn absolute top-3 right-3 z-10" aria-label="Fermer" onClick={onClose}>
          <span aria-hidden="true" className="text-xl leading-none">
            ×
          </span>
        </button>
        {isError ? (
          <div role="alert" className="space-y-3 p-6">
            <p>Cet accessoire n&apos;a pas pu être chargé.</p>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => refetch()}>
              Réessayer
            </button>
          </div>
        ) : !product || product.slug !== slug ? (
          <p className="p-6 text-ink-muted">Chargement…</p>
        ) : (
          // `key` : changer d'accessoire repart de choix vides.
          <AccessoryChoices key={product.slug} product={product} />
        )}
      </div>
    </dialog>
  );
}

// Les options d'un accessoire, dans l'ordre où ses variantes les donnent, avec leurs valeurs.
function optionsOf(variants: Variant[]): [string, string[]][] {
  const options = new Map<string, string[]>();
  for (const variant of variants) {
    for (const [key, value] of Object.entries(variant.options)) {
      const values = options.get(key) ?? [];
      if (!values.includes(value)) values.push(value);
      options.set(key, values);
    }
  }
  return [...options];
}

function AccessoryChoices({ product }: { product: ProductDetail }) {
  const variants = product.variants.filter((variant) => variant.condition === "new");
  const options = optionsOf(variants);
  // Une option à une seule valeur est déjà choisie.
  const [chosen, setChosen] = useState<Options>(() =>
    Object.fromEntries(options.filter(([, values]) => values.length === 1).map(([key, values]) => [key, values[0]])),
  );
  const [modelQuery, setModelQuery] = useState("");
  const choose = (key: string, value: string) => setChosen((current) => ({ ...current, [key]: value }));
  const variant = findVariant(variants, chosen);
  const missing = options.find(([key]) => !chosen[key]);
  const prices = variants.map((one) => one.price);
  const query = new URLSearchParams(chosen).toString();

  return (
    <div className="grid sm:grid-cols-[240px_1fr]">
      <div className="relative h-36 bg-surface-2 sm:h-auto sm:min-h-80">
        <ProductImage src={product.images[0]?.url ?? null} alt="" sizes="240px" />
      </div>
      <div className="space-y-4 p-5 sm:p-6">
        <div className="space-y-1.5 pe-10">
          {product.maker ? (
            <span className="inline-block rounded-full border border-line px-2 py-0.5 text-[11px] font-bold tracking-wide text-ink-muted uppercase">
              {product.maker.name}
            </span>
          ) : null}
          <h2 id="accessory-dialog-title" className="text-xl leading-tight">
            {product.name}
          </h2>
          <p className="text-sm text-ink-muted">{product.description}</p>
        </div>

        {options.map(([key, values]) => (
          <fieldset key={key} className="space-y-2">
            <legend className="flex gap-2 text-xs font-bold text-ink-muted">
              {key}
              {chosen[key] ? <span className="font-semibold text-ink">{chosen[key]}</span> : null}
            </legend>
            {key === SIZE ? (
              <SizePicker variants={variants} values={values} chosen={chosen} onChoose={(size) => choose(SIZE, size)} />
            ) : key === MODEL && values.length > 8 ? (
              <div className="space-y-2">
                <input
                  type="search"
                  autoComplete="off"
                  aria-label="Cherche ton téléphone"
                  className="input w-full"
                  placeholder={`Cherche ton téléphone (ex. ${values[0]})`}
                  value={modelQuery}
                  onChange={(event) => setModelQuery(event.target.value)}
                />
                <ul className="flex flex-wrap gap-1.5">
                  {matchChoices(
                    values.filter((value) => isPossible(variants, key, value, chosen)),
                    modelQuery,
                    8,
                  ).map((value) => (
                    <li key={value}>
                      <button
                        type="button"
                        aria-pressed={chosen[key] === value}
                        onClick={() => choose(key, value)}
                        className={`rounded-full border px-3 py-1 text-xs ${
                          chosen[key] === value ? "border-blue bg-blue-soft" : "border-line bg-surface-2 hover:border-blue-ink"
                        }`}
                      >
                        {value}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {values.map((value) => {
                  const possible = isPossible(variants, key, value, chosen);
                  const soldOut = findVariant(variants, { ...chosen, [key]: value })?.stock === 0;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={chosen[key] === value}
                      disabled={!possible}
                      onClick={() => choose(key, value)}
                      className={`rounded-[var(--radius-field)] border px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        chosen[key] === value ? "border-blue bg-blue-soft" : "border-line hover:border-blue-ink"
                      } ${!possible || soldOut ? "line-through" : ""}`}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            )}
          </fieldset>
        ))}

        <div className="space-y-3 border-t border-line pt-4">
          {variant ? (
            <AddToCartButton variant={variant} />
          ) : (
            <>
              <p className="font-display text-xl font-bold tabular-nums">
                {new Set(prices).size > 1 ? <span className="text-sm font-medium text-ink-muted">dès </span> : null}
                {formatPrice(Math.min(...prices))}
              </p>
              <button type="button" className="btn btn-secondary w-full" disabled>
                Choisis : {missing ? missing[0].toLowerCase() : "une option"}
              </button>
            </>
          )}
          <Link href={`/produits/${product.slug}${query ? `?${query}` : ""}`} className="block text-center text-sm text-blue-ink underline">
            Voir la fiche complète
          </Link>
        </div>
      </div>
    </div>
  );
}
