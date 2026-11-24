"use client";

import Link from "next/link";
import { useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ProductImage from "@/components/ui/ProductImage";
import { swatchOf } from "@/config/colors";
import { errorMessage } from "@/lib/errors";
import { useUpdateModelMutation, type AdminSeriesModel } from "@/features/admin/api/catalogApi";
import EditDialog from "../products/EditDialog";
import { usePalette } from "../usePalette";
import { effectiveGlow, modelCounts } from "./modelCard";

// La carte d'un modèle dans une série (refaite le 24/11, demande de Mehdi : la page était trop chargée). Toute la carte
// est un lien vers la fiche produit (lien étiré sur le nom : les boutons de la carte passent au-dessus, `z-10`).
// « Couleurs & stock » et « Modifier la fiche » ne font plus qu'une page : la fiche règle aussi les couleurs du modèle,
// leurs photos et leur stock. La carte garde le nombre de neufs et d'occasions, même sans fiche, et le choix du reflet
// de l'affiche. L'année, l'ordre et le retrait de la série sont dans la fenêtre « ⋯ » : on s'en sert rarement.
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [year, setYear] = useState(model.releaseYear ? String(model.releaseYear) : "");
  const product = model.product;
  const palette = usePalette();
  // Une seule destination (24/11) : la fiche du produit, ou son formulaire de création quand le modèle n'en a pas.
  const ficheHref = product ? `/admin/produits/${product.id}` : newProductHref;
  const counts = modelCounts(product);
  const glow = effectiveGlow(model.colors, model.posterColor);

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
      className="card relative overflow-hidden p-3 transition-[border-color,box-shadow] hover:border-blue-ink hover:shadow-[var(--shadow)] sm:p-4"
    >
      <div className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[88px_minmax(0,1fr)] sm:gap-4">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-surface-2">
          <ProductImage src={product?.image ?? null} alt="" sizes="88px" />
        </div>

        <div className="min-w-0 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                Modèle {index + 1}
                {model.releaseYear ? ` · ${model.releaseYear}` : ""}
              </p>
              <h3 className="truncate text-base font-bold sm:text-lg">
                {/* Le lien étiré : son ::after couvre toute la carte, les éléments `z-10` restent cliquables. */}
                <Link href={ficheHref} className="after:absolute after:inset-0 after:content-[''] hover:text-blue-ink">
                  {model.name}
                </Link>
              </h3>
            </div>
            <button
              type="button"
              className="icon-btn relative z-10 !h-9 !w-9 shrink-0"
              aria-label={`Réglages de ${model.name} (année, ordre, retrait)`}
              title="Année, ordre, retrait de la série"
              onClick={() => setSettingsOpen(true)}
            >
              ⋯
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2" aria-label={`Stock de ${model.name}`}>
            <div className="rounded-lg border border-blue-ink/15 bg-blue-soft/40 px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-ink">Neuf scellé</p>
              <p className="mt-0.5 text-sm font-bold text-blue-ink">
                {counts.newStock} <span className="font-medium">en stock</span>
              </p>
            </div>
            <div className="rounded-lg border border-red/15 bg-red-soft/40 px-2.5 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-red">Occasions</p>
              <p className="mt-0.5 text-sm font-bold text-red">
                {counts.deals} <span className="font-medium">{counts.deals > 1 ? "disponibles" : "disponible"}</span>
              </p>
            </div>
          </div>
          {product && product.soldOutColors.length > 0 ? (
            <p className="text-xs text-ink-muted">Épuisé : {product.soldOutColors.join(", ")}</p>
          ) : null}

          <fieldset className="flex flex-wrap items-center gap-1.5">
            <legend className="sr-only">Reflet de l&apos;affiche</legend>
            <span aria-hidden="true" className="mr-1 text-xs font-semibold text-ink-muted">
              Reflet
            </span>
            {model.colors.length === 0 ? (
              <span className="text-xs text-ink-muted">Ajoute d&apos;abord les couleurs dans la fiche.</span>
            ) : (
              <>
                {model.colors.map((color) => {
                  const swatch = swatchOf(color, palette);
                  const active = glow === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      aria-pressed={active}
                      aria-label={`Reflet ${color}`}
                      title={swatch ? color : `${color} (teinte à régler dans Listes)`}
                      onClick={() => update({ id: model.id, posterColor: color })}
                      className={`relative z-10 grid size-7 place-items-center rounded-full border text-[10px] font-bold ${
                        active ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : "border-line"
                      } ${swatch ? "" : "border-dashed"}`}
                      style={swatch ? { backgroundColor: swatch } : undefined}
                    >
                      {swatch ? null : color.slice(0, 2)}
                    </button>
                  );
                })}
                <button
                  type="button"
                  aria-pressed={model.posterColor === null}
                  onClick={() => update({ id: model.id, posterColor: null })}
                  className={`relative z-10 ml-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    model.posterColor === null ? "border-ink text-ink" : "border-line text-ink-muted"
                  }`}
                >
                  Auto
                </button>
              </>
            )}
          </fieldset>
          {updateState.error ? <p className="field-error">{errorMessage(updateState.error)}</p> : null}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
        <span aria-hidden="true" className="text-xs text-ink-muted">
          Couleurs, photos et stock dans la fiche
        </span>
        <Link href={ficheHref} className="btn btn-secondary btn-small relative z-10 min-h-10 justify-center">
          {product ? "Modifier la fiche" : "Créer la fiche"}
        </Link>
      </div>

      <EditDialog open={settingsOpen} title={`Réglages · ${model.name}`} size="sm" onClose={() => setSettingsOpen(false)}>
        <div className="space-y-5">
          <label className="block text-sm font-semibold">
            <span className="label">Année de sortie</span>
            <input
              className="input w-28"
              inputMode="numeric"
              aria-label={`Année de ${model.name}`}
              value={year}
              onChange={(event) => setYear(event.target.value)}
              onBlur={saveYear}
            />
            <span className="mt-1 block text-xs font-normal text-ink-muted">Sert au tri « les plus récents » de la boutique.</span>
          </label>

          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Ordre dans la série : {index + 1} sur {count}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-secondary btn-small" disabled={index === 0} onClick={() => onMove(index, index - 1)}>
                ↑ Monter
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                disabled={index === count - 1}
                onClick={() => onMove(index, index + 1)}
              >
                ↓ Descendre
              </button>
            </div>
            <p className="text-xs text-ink-muted">Sur ordinateur, on peut aussi faire glisser la carte.</p>
          </div>

          <div className="space-y-2 border-t border-line pt-4">
            <ConfirmDialog
              trigger="Retirer ce modèle de la série"
              triggerClassName="btn btn-small border-red text-red hover:bg-red-soft"
              title={`Retirer « ${model.name} » de la série ?`}
              confirmLabel="Retirer"
              onConfirm={() => {
                setSettingsOpen(false);
                onRemove();
              }}
            >
              Le modèle n&apos;est pas supprimé, il quitte seulement cette série (et son affiche).
            </ConfirmDialog>
          </div>
          {updateState.error ? <p className="field-error">{errorMessage(updateState.error)}</p> : null}
        </div>
      </EditDialog>
    </li>
  );
}
