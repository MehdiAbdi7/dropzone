"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import ProductImage from "@/components/ui/ProductImage";
import { CONDITION_LABELS } from "@/config/catalog";
import { useDeleteColorPhotoMutation, useModelColorQuery, useUploadColorPhotoMutation } from "@/features/admin/adminApi";
import AddUnitDialog from "@/features/admin/catalog/AddUnitDialog";
import Breadcrumb from "@/features/shop/Breadcrumb";
import { kindIcon } from "@/features/shop/colors";
import { errorMessage } from "@/lib/errors";
import { formatPrice } from "@/lib/format";
import type { Condition } from "@/types/api";

// Le segment de l'adresse, décodé une fois (« Orange%20cosmique » → « Orange cosmique »).
function decoded(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

// Écran 5 du Catalogue (étape Couleur, 05/11) : une couleur d'un modèle. Sa photo, ses
// exemplaires, et l'ajout d'un neuf scellé ou d'une affaire, modèle et couleur remplis.
export default function CatalogColorPage() {
  const params = useParams<{ id: string; couleur: string }>();
  const id = Number(params.id);
  const color = decoded(params.couleur);
  const { data, isLoading, error } = useModelColorQuery({ id, color });
  const [upload, uploadState] = useUploadColorPhotoMutation();
  const [removePhoto, removeState] = useDeleteColorPhotoMutation();
  const [adding, setAdding] = useState<Condition | null>(null);

  if (isLoading) {
    return <p className="text-ink-muted">Chargement…</p>;
  }
  if (error || !data) {
    return <p className="field-error">{error ? errorMessage(error) : "Couleur introuvable"}</p>;
  }
  const { model, productId, variants } = data;
  const photoError = uploadState.error ?? removeState.error;

  return (
    <div className="max-w-5xl space-y-6">
      <Breadcrumb
        items={[
          { label: "Catalogue", href: "/admin/catalogue" },
          ...(model.series ? [{ label: model.series.name, href: `/admin/catalogue/series/${model.series.id}` }] : []),
          { label: model.name, href: `/admin/catalogue/modeles/${model.id}` },
          { label: data.color.name },
        ]}
      />

      <section aria-labelledby="color-title" className="card flex flex-wrap items-start gap-4 p-4">
        <div className="relative aspect-square w-32 shrink-0 overflow-hidden rounded-lg bg-surface-2">
          <ProductImage src={data.color.photoUrl ?? kindIcon(model.kind)} alt="" sizes="128px" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-sm font-semibold text-ink-muted">{model.name}</p>
            <h1 id="color-title" className="text-2xl">
              {data.color.name}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="btn btn-secondary btn-small cursor-pointer">
              {uploadState.isLoading ? "Envoi…" : data.color.photoUrl ? "Changer la photo" : "Ajouter une photo"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    upload({ id: model.id, color: data.color.name, file });
                  }
                }}
              />
            </label>
            {data.color.photoUrl ? (
              <button
                type="button"
                className="btn btn-outline btn-small"
                disabled={removeState.isLoading}
                onClick={() => removePhoto({ id: model.id, color: data.color.name })}
              >
                Retirer la photo
              </button>
            ) : null}
          </div>
          {photoError ? <p className="field-error">{errorMessage(photoError)}</p> : null}
        </div>
      </section>

      <section aria-labelledby="units-title" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="units-title" className="text-xl">
            Exemplaires en {data.color.name}
          </h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary btn-small" onClick={() => setAdding("new")}>
              + Ajouter un neuf scellé
            </button>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => setAdding("refurbished")}>
              + Ajouter une affaire
            </button>
          </div>
        </div>
        {!productId ? (
          <p className="text-sm text-ink-muted">
            Ce modèle n&apos;a pas encore de fiche : le premier exemplaire la crée, publiée tout de suite.
          </p>
        ) : null}
        {variants.length === 0 ? (
          <p className="card p-4 text-sm text-ink-muted">Aucun exemplaire dans cette couleur.</p>
        ) : (
          <ul className="space-y-2">
            {variants.map((variant) => {
              const deal = variant.condition === "refurbished";
              const facts = deal
                ? [
                    variant.options.Stockage,
                    variant.grade !== null ? `${variant.grade}/10` : "note non précisée",
                    variant.batteryHealth !== null ? `batterie ${variant.batteryHealth} %` : null,
                    variant.reference ? `réf. ${variant.reference}` : null,
                    variant.stock === 0 ? "vendue" : null,
                  ]
                : [variant.options.Stockage, `${variant.stock} en stock`];
              return (
                <li key={variant.id} className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={`badge ${deal ? "bg-ink text-surface" : "bg-blue text-on-brand"}`}>
                      {CONDITION_LABELS[variant.condition]}
                    </span>
                    {facts.filter(Boolean).join(" · ")}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-display font-bold">{formatPrice(variant.price)}</span>
                    {productId ? (
                      <Link href={`/admin/produits/${productId}`} className="text-blue-ink underline">
                        Modifier
                      </Link>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <AddUnitDialog
        modelId={model.id}
        modelName={model.name}
        kind={model.kind}
        color={data.color.name}
        condition={adding}
        onClose={() => setAdding(null)}
      />
    </div>
  );
}
