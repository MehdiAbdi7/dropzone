"use client";

import Link from "next/link";
import ProductImage from "@/components/ui/ProductImage";
import { useModelColorsQuery, useDeleteColorPhotoMutation, useUploadColorPhotoMutation } from "@/features/admin/api/colorsApi";
import { useUpdateModelMutation } from "@/features/admin/api/catalogApi";
import { colorRows } from "@/features/admin/catalog/modelCard";
import { errorMessage } from "@/lib/errors";
import { usePalette } from "../usePalette";
import ChoicePicker from "./ChoicePicker";

// La fenêtre « Couleurs du modèle » de la fiche produit (24/11, demande de Mehdi) : les couleurs du modèle, chacune avec
// SA photo, et l'ajout ou le retrait d'une couleur. Tout part tout de suite (comme la photo d'une variante) : pas de
// bouton « Enregistrer ». La photo d'une couleur appartient au modèle, toutes les variantes de cette couleur la partagent
// et la boutique la montre à l'étape Couleur. Retirer une couleur encore portée par des exemplaires est refusé par l'API
// (le message s'affiche ici). Chaque couleur dit son stock et propose d'y ajouter un neuf scellé ou une occasion (la
// fenêtre de la variante s'ouvre, couleur déjà posée) : c'est l'ancienne page « Couleurs & stock », fusionnée avec la
// fiche le 24/11.
export default function ModelColorsPanel({
  modelId,
  onAddVariant,
}: {
  modelId: number;
  onAddVariant: (color: string, condition: "new" | "refurbished") => void;
}) {
  const { data, isLoading, error } = useModelColorsQuery(modelId);
  const [upload, uploadState] = useUploadColorPhotoMutation();
  const [removePhoto, removeState] = useDeleteColorPhotoMutation();
  const [update, updateState] = useUpdateModelMutation();
  const palette = usePalette();

  if (isLoading) return <p className="text-ink-muted">Chargement…</p>;
  if (error || !data) return <p className="field-error">{error ? errorMessage(error) : "Modèle introuvable"}</p>;

  const rows = colorRows(data.colors, palette);
  const withoutHue = rows.filter((row) => row.missingHue).map((row) => row.name);
  const failure = uploadState.error ?? removeState.error ?? updateState.error;

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-muted">
        Chaque couleur a sa photo, partagée par toutes ses variantes (neuf et occasion). La boutique la montre au choix de la
        couleur.
      </p>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-4 text-sm text-ink-muted">
          Ce modèle n&apos;a pas encore de couleur. Ajoutes-en ci-dessous.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((row) => {
            const busy = uploadState.isLoading && uploadState.originalArgs?.color === row.name;
            return (
              <li key={row.name} className="card flex min-w-0 gap-3 p-3">
                <div
                  className={`relative size-20 shrink-0 overflow-hidden rounded-lg bg-surface-2 ${
                    row.missingPhoto ? "border border-dashed border-ink-muted" : ""
                  }`}
                >
                  {row.photoUrl ? (
                    <ProductImage src={row.photoUrl} alt={`Photo en ${row.name}`} sizes="80px" />
                  ) : (
                    <span className="flex h-full items-center justify-center px-1 text-center text-xs text-ink-muted">Aucune photo</span>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`size-4 shrink-0 rounded-full border ${row.hex ? "border-ink-muted/60" : "border-dashed border-ink-muted"}`}
                      style={row.hex ? { background: row.hex } : undefined}
                    />
                    <span className="truncate font-display text-sm font-bold">{row.name}</span>
                  </div>
                  <p className="text-xs text-ink-muted">
                    {row.newStock} neuf{row.newStock > 1 ? "s" : ""} · {row.refurbishedCount} occasion{row.refurbishedCount > 1 ? "s" : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn btn-primary btn-small" onClick={() => onAddVariant(row.name, "new")}>
                      + Neuf
                    </button>
                    <button type="button" className="btn btn-primary btn-small" onClick={() => onAddVariant(row.name, "refurbished")}>
                      + Occasion
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="btn btn-secondary btn-small cursor-pointer">
                      {busy ? "Envoi…" : row.photoUrl ? "Changer" : "Ajouter la photo"}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={uploadState.isLoading}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (file) upload({ id: modelId, color: row.name, file });
                        }}
                      />
                    </label>
                    {row.photoUrl ? (
                      <button
                        type="button"
                        className="btn btn-outline btn-small"
                        disabled={removeState.isLoading}
                        onClick={() => removePhoto({ id: modelId, color: row.name })}
                      >
                        Retirer
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <section className="space-y-2 border-t border-line pt-4">
        <p className="text-sm font-semibold">Ajouter ou retirer des couleurs</p>
        <ChoicePicker
          group="color"
          label="Couleurs officielles du modèle"
          multiple
          value={data.colors.map((color) => color.name)}
          onChange={(colors) => update({ id: modelId, colors })}
        />
        {withoutHue.length > 0 ? (
          <p className="text-xs text-ink-muted">
            Teinte à régler pour {withoutHue.join(", ")} (pastille et reflet de l&apos;affiche).{" "}
            <Link href="/admin/listes" className="font-semibold text-blue-ink underline">
              Régler dans Listes
            </Link>
          </p>
        ) : null}
      </section>

      {failure ? (
        <p role="alert" className="field-error">
          {errorMessage(failure)}
        </p>
      ) : null}
    </div>
  );
}
