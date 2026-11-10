"use client";

import ProductImage from "@/components/ui/ProductImage";
import { errorMessage } from "@/lib/errors";
import { useDeleteColorPhotoMutation, useModelColorsQuery, useUploadColorPhotoMutation } from "@/features/admin/api/colorsApi";

// La photo de la couleur d'une variante (06/11) : « j'ajoute un iPhone rose, je mets la
// photo de l'iPhone rose ». Elle appartient au modèle et à la couleur (table
// `model_color_photos`), pas à la variante : toutes les variantes roses la partagent, et la
// boutique la montre à l'étape Couleur puis à Neuf scellé / Affaire. L'envoi part tout de
// suite, sans attendre « Enregistrer » ; une couleur nouvelle entre dans le modèle.
export default function ColorPhotoField({ modelId, color }: { modelId: number; color: string }) {
  const { data } = useModelColorsQuery(modelId);
  const [upload, uploadState] = useUploadColorPhotoMutation();
  const [remove, removeState] = useDeleteColorPhotoMutation();
  // Même comparaison que l'API : sans casse ni espaces autour (« rose » = « Rose »).
  const key = color.trim().toLowerCase();
  const photoUrl = data?.colors.find((item) => item.name.trim().toLowerCase() === key)?.photoUrl ?? null;
  const busy = uploadState.isLoading || removeState.isLoading;
  const failure = uploadState.error ?? removeState.error;

  return (
    <div className="space-y-2">
      <p className="label">Photo en {color}</p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-2">
          {photoUrl ? (
            <ProductImage src={photoUrl} alt={`Photo en ${color}`} sizes="80px" />
          ) : (
            <span className="flex h-full items-center justify-center px-1 text-center text-xs text-ink-muted">Aucune photo</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="btn btn-secondary btn-small cursor-pointer">
            {uploadState.isLoading ? "Envoi…" : photoUrl ? "Changer la photo" : "Ajouter la photo"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) {
                  upload({ id: modelId, color, file });
                }
              }}
            />
          </label>
          {photoUrl ? (
            <button type="button" className="btn btn-outline btn-small" disabled={busy} onClick={() => remove({ id: modelId, color })}>
              Retirer
            </button>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-ink-muted">Partagée par toutes les variantes en {color} de ce modèle.</p>
      {failure ? <p className="field-error">{errorMessage(failure)}</p> : null}
    </div>
  );
}
