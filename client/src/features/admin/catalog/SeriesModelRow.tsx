"use client";

import Link from "next/link";
import { useState } from "react";
import ProductImage from "@/components/ui/ProductImage";
import { swatchOf } from "@/config/colors";
import { errorMessage } from "@/lib/errors";
import { useUpdateModelMutation, type AdminSeriesModel } from "../adminApi";
import ChoicePicker from "../products/ChoicePicker";
import { usePalette } from "../usePalette";

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
      className="card overflow-hidden p-3 sm:p-4"
    >
      <div className="grid grid-cols-[auto_56px_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[auto_72px_minmax(0,1fr)_180px] sm:items-center sm:gap-4">
        <div className="flex flex-col items-center gap-1 self-center">
          <span
            aria-hidden="true"
            title="Glisser pour changer l'ordre"
            className="cursor-grab px-1 text-lg leading-none text-ink-muted"
          >
            ⋮⋮
          </span>
          <button
            type="button"
            className="icon-btn !h-9 !w-9"
            aria-label={`Monter ${model.name}`}
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
          >
            ↑
          </button>
          <button
            type="button"
            className="icon-btn !h-9 !w-9"
            aria-label={`Descendre ${model.name}`}
            disabled={index === count - 1}
            onClick={() => onMove(index, index + 1)}
          >
            ↓
          </button>
        </div>

        <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-surface-2 sm:h-[72px] sm:w-[72px]">
          <ProductImage src={product?.image ?? null} alt="" sizes="72px" />
        </div>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                Modèle {index + 1}
              </p>
              <h3 className="truncate text-base font-bold sm:text-lg">{model.name}</h3>
            </div>
            <label className="flex items-center gap-2 text-xs text-ink-muted">
              Année
              <input
                className="input min-h-9 w-[4.5rem] px-2 py-1 text-sm"
                inputMode="numeric"
                aria-label={`Année de ${model.name}`}
                value={year}
                onChange={(event) => setYear(event.target.value)}
                onBlur={saveYear}
              />
            </label>
          </div>

          {product ? (
            <div className="grid grid-cols-2 gap-2" aria-label={`Stock de ${model.name}`}>
              <div className="rounded-lg border border-blue-ink/15 bg-blue-soft/40 px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-ink">Neuf scellé</p>
                <p className="mt-0.5 text-sm font-bold text-blue-ink">
                  {product.newStock} <span className="font-medium">en stock</span>
                </p>
              </div>
              <div className="rounded-lg border border-red/15 bg-red-soft/40 px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-red">Affaires</p>
                <p className="mt-0.5 text-sm font-bold text-red">
                  {product.dealCount} <span className="font-medium">{product.dealCount > 1 ? "disponibles" : "disponible"}</span>
                </p>
              </div>
              {product.soldOutColors.length > 0 ? (
                <p className="col-span-2 text-xs text-ink-muted">
                  Épuisé : {product.soldOutColors.join(", ")}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-line px-3 py-2 text-sm text-ink-muted">
              Aucune fiche produit pour le moment
            </p>
          )}

          {product?.status === "draft" ? (
            <p className="text-xs text-ink-muted">
              <span className="badge bg-[#ffb547] text-black">Brouillon</span>{" "}
              Non visible en boutique tant que la fiche n&apos;est pas publiée.
            </p>
          ) : null}
          {updateState.error ? <p className="field-error">{errorMessage(updateState.error)}</p> : null}
        </div>

        <div className="col-span-3 grid grid-cols-2 gap-2 border-t border-line pt-3 sm:col-span-1 sm:grid-cols-1 sm:border-0 sm:pt-0">
          <Link
            href={`/admin/catalogue/modeles/${model.id}`}
            className="btn btn-primary btn-small min-h-10 justify-center text-center"
          >
            Couleurs & stock
          </Link>
          {product ? (
            <>
              <Link
                href={`/admin/produits/${product.id}`}
                className="btn btn-secondary btn-small min-h-10 justify-center text-center"
              >
                Modifier la fiche
              </Link>
              <Link
                href={`/admin/produits/${product.id}#variantes`}
                className="col-span-2 text-center text-xs font-semibold text-blue-ink hover:underline sm:col-span-1"
              >
                + Ajouter un appareil
              </Link>
            </>
          ) : (
            <Link
              href={newProductHref}
              className="btn btn-secondary btn-small min-h-10 justify-center text-center"
            >
              Créer la fiche
            </Link>
          )}
        </div>
      </div>

      <details className="group mt-3 border-t border-line pt-2">
        <summary className="cursor-pointer list-none text-xs font-semibold text-ink-muted marker:hidden">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="transition-transform group-open:rotate-180">⌄</span>
            Affichage sur l&apos;affiche
            <span className="font-normal">
              · {model.colors.length} couleur{model.colors.length === 1 ? "" : "s"}
              {model.colors[0] ? ` · Lueur ${model.posterColor ?? `auto (${model.colors[0]})`}` : ""}
            </span>
          </span>
        </summary>
        <div className="mt-3 grid gap-4 rounded-lg bg-surface-2/50 p-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold">Couleurs officielles</p>
            <p className="text-xs text-ink-muted">Utilisées pour les pastilles et les filtres de la boutique.</p>
            <ChoicePicker
              group="color"
              label={`Couleurs officielles de ${model.name}`}
              multiple
              value={model.colors}
              onChange={(colors) => update({ id: model.id, colors })}
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold">Lueur de l&apos;affiche</legend>
            {model.colors.length === 0 ? (
              <p className="text-xs text-ink-muted">Ajoute d&apos;abord les couleurs du modèle.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-pressed={model.posterColor === null}
                  onClick={() => update({ id: model.id, posterColor: null })}
                  className={`rounded-full border px-3 py-1.5 text-xs ${model.posterColor === null ? "border-ink bg-surface text-ink" : "border-line text-ink-muted"}`}
                >
                  Auto · {model.colors[0]}
                </button>
                {model.colors.map((color) => {
                  const swatch = swatchOf(color, palette);
                  const active = model.posterColor === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      aria-pressed={active}
                      aria-label={`Lueur ${color}`}
                      title={color}
                      onClick={() => update({ id: model.id, posterColor: color })}
                      className={`h-8 min-w-8 rounded-full border ${active ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : "border-line"}`}
                      style={swatch ? { backgroundColor: swatch } : undefined}
                    >
                      {swatch ? null : <span className="px-2 text-xs">{color}</span>}
                    </button>
                  );
                })}
              </div>
            )}
            {withoutHue.length > 0 ? (
              <p className="text-xs text-ink-muted">
                Teinte manquante pour {withoutHue.join(", ")}.{" "}
                <Link href="/admin/listes" className="font-semibold text-blue-ink underline">
                  Régler dans Listes
                </Link>
              </p>
            ) : null}
          </fieldset>
        </div>
      </details>

      <div className="mt-2 flex justify-end">
        <button type="button" className="text-xs text-ink-muted hover:text-red" onClick={onRemove}>
          Retirer ce modèle de la série
        </button>
      </div>
    </li>
  );
}
