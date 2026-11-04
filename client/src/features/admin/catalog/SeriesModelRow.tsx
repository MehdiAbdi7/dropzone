"use client";

import Link from "next/link";
import { useState } from "react";
import ProductImage from "@/components/ui/ProductImage";
import { swatchOf } from "@/config/colors";
import { errorMessage } from "@/lib/errors";
import { useUpdateModelMutation, type AdminSeriesModel } from "../adminApi";
import { usePalette } from "../usePalette";

// Un modèle de la série dans le Catalogue : sa place dans l'affiche (poignée à glisser,
// ou Monter / Descendre au clavier), son année, la couleur de sa lueur, son stock, et les
// raccourcis vers le formulaire produit.
export default function SeriesModelRow({
  model,
  index,
  count,
  newProductHref,
  onMove,
  onRemove,
  onDragStart,
  onDrop,
}: {
  model: AdminSeriesModel;
  index: number;
  count: number;
  newProductHref: string;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  const [update, updateState] = useUpdateModelMutation();
  const [year, setYear] = useState(model.releaseYear ? String(model.releaseYear) : "");
  const product = model.product;
  // Les teintes réglées dans Listes : une couleur sans teinte donnerait une lueur violette.
  const palette = usePalette();
  const withoutHue = model.colors.filter((color) => !swatchOf(color, palette));

  function saveYear() {
    if (/^\d{4}$/.test(year) && Number(year) !== model.releaseYear) {
      update({ id: model.id, releaseYear: Number(year) });
    }
  }

  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      className="card grid gap-3 p-3 sm:grid-cols-[auto_72px_1fr_auto] sm:items-center"
    >
      <div className="flex items-center gap-1 sm:flex-col">
        <span aria-hidden="true" title="Glisser pour changer l'ordre" className="cursor-grab px-1 text-lg leading-none text-ink-muted">
          ⋮⋮
        </span>
        <button
          type="button"
          className="icon-btn"
          aria-label={`Monter ${model.name}`}
          disabled={index === 0}
          onClick={() => onMove(index, index - 1)}
        >
          ↑
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label={`Descendre ${model.name}`}
          disabled={index === count - 1}
          onClick={() => onMove(index, index + 1)}
        >
          ↓
        </button>
      </div>

      <div className="relative h-16 w-[72px] overflow-hidden rounded-lg bg-surface-2">
        <ProductImage src={product?.image ?? null} alt="" sizes="72px" />
      </div>

      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-base font-bold">{model.name}</h3>
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            Année
            <input
              className="input min-h-8 w-20 py-0.5 text-sm"
              inputMode="numeric"
              value={year}
              onChange={(event) => setYear(event.target.value)}
              onBlur={saveYear}
            />
          </label>
        </div>

        {model.colors.length > 0 ? (
          <fieldset className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <legend className="sr-only">Couleur de la lueur de {model.name}</legend>
            <span aria-hidden="true">Lueur :</span>
            <button
              type="button"
              aria-pressed={model.posterColor === null}
              onClick={() => update({ id: model.id, posterColor: null })}
              className={`rounded-full border px-2 py-0.5 ${model.posterColor === null ? "border-ink text-ink" : "border-line"}`}
            >
              Auto
            </button>
            {model.colors.map((color) => {
              const swatch = swatchOf(color, palette);
              const active = model.posterColor === color;
              return (
                <button
                  key={color}
                  type="button"
                  aria-pressed={active}
                  aria-label={color}
                  title={color}
                  onClick={() => update({ id: model.id, posterColor: color })}
                  className={`h-6 min-w-6 rounded-full border ${active ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : "border-line"}`}
                  style={swatch ? { backgroundColor: swatch } : undefined}
                >
                  {swatch ? null : <span className="px-2">{color}</span>}
                </button>
              );
            })}
            {withoutHue.length > 0 ? (
              <span className="basis-full">
                Sans teinte, la lueur reste violette : {withoutHue.join(", ")}.{" "}
                <Link href="/admin/listes" className="text-blue-ink underline">
                  Choisir la teinte dans Listes
                </Link>
              </span>
            ) : null}
          </fieldset>
        ) : null}

        {product ? (
          <div className="flex flex-wrap gap-1.5">
            <span className="badge bg-blue-soft text-blue-ink">Neuf scellé : {product.newStock} en stock</span>
            {product.soldOutColors.map((color) => (
              <span key={color} className="badge badge-out line-through">
                {color} épuisée
              </span>
            ))}
            <span className={product.dealCount > 0 ? "badge bg-red-soft text-red" : "badge badge-out"}>
              {product.dealCount > 0 ? `${product.dealCount} affaire${product.dealCount > 1 ? "s" : ""}` : "Aucune affaire"}
            </span>
          </div>
        ) : (
          <p className="text-xs text-ink-muted">Pas encore de fiche produit : le modèle n&apos;apparaît pas sur l&apos;affiche.</p>
        )}
        {updateState.error ? <p className="field-error">{errorMessage(updateState.error)}</p> : null}
      </div>

      <div className="flex flex-wrap gap-2 sm:flex-col">
        {product ? (
          <>
            <Link href={`/admin/produits/${product.id}#variantes`} className="btn btn-primary btn-small">
              + Ajouter un appareil
            </Link>
            <Link href={`/admin/produits/${product.id}`} className="btn btn-secondary btn-small">
              Modifier la fiche
            </Link>
          </>
        ) : (
          <Link href={newProductHref} className="btn btn-primary btn-small">
            Créer la fiche
          </Link>
        )}
        <button type="button" className="btn btn-outline btn-small" onClick={onRemove}>
          Retirer de la série
        </button>
      </div>
    </li>
  );
}
