"use client";

import { useState } from "react";
import ProductImage from "@/components/ui/ProductImage";
import { useDeleteStagePhotoMutation, useUpdateStageLabelMutation, useUploadStagePhotoMutation } from "@/features/admin/api/stageApi";
import { errorMessage } from "@/lib/errors";

// Une ligne de la page Personnalisation : la photo d'un emplacement d'un socle, avec ses
// boutons (ajouter ou changer, retirer, renommer). Les socles de l'accueil (hero, deal) et la
// composition de chaque catégorie (category-<id>) s'en servent : mêmes routes de l'API.
export default function SlotRow({
  stage,
  slot,
  label,
  url,
  canRename,
  onCancel,
}: {
  stage: string;
  slot: string;
  label: string;
  url: string | null;
  canRename: boolean;
  // La case d'un emplacement en plus pas encore envoyé : « Annuler » la fait disparaître.
  onCancel?: () => void;
}) {
  const [upload, uploadState] = useUploadStagePhotoMutation();
  const [remove, removeState] = useDeleteStagePhotoMutation();
  const [updateLabel, labelState] = useUpdateStageLabelMutation();
  const [title, setTitle] = useState(label);
  const [editing, setEditing] = useState(false);
  const busy = uploadState.isLoading || removeState.isLoading || labelState.isLoading;
  const failure = uploadState.error ?? removeState.error ?? labelState.error;
  const titleChanged = title.trim() !== label;

  async function saveLabel() {
    try {
      await updateLabel({ stage, slot, label: title.trim() }).unwrap();
      setTitle(title.trim());
      setEditing(false);
    } catch {
      // L'erreur de la mutation est affichée dans la carte.
    }
  }

  return (
    <div className="flex gap-3 rounded-xl border border-line bg-surface p-3 sm:gap-4">
      {/* Un damier sous la photo : on voit si le fond est bien transparent. */}
      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-[repeating-conic-gradient(var(--surface-2)_0_25%,var(--surface)_0_50%)] bg-[length:16px_16px] sm:size-[4.5rem]">
        {url ? (
          <ProductImage src={url} alt={label} sizes="72px" />
        ) : (
          <span className="flex h-full items-center justify-center text-xs text-ink-muted">Vide</span>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <p className="min-w-0 break-words pt-1 text-sm font-semibold">{label}</p>
          {canRename ? (
            <button
              type="button"
              className="btn btn-outline btn-small shrink-0"
              disabled={busy}
              onClick={() => {
                setTitle(label);
                setEditing((current) => !current);
              }}
            >
              {editing ? "Fermer" : "Renommer"}
            </button>
          ) : null}
        </div>
        {editing ? (
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-[12rem] flex-1 space-y-1 text-xs font-medium text-ink-muted">
              <span>Nouvel intitulé</span>
              <input
                type="text"
                maxLength={60}
                value={title}
                className="field-input w-full"
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              disabled={!titleChanged || !title.trim() || busy}
              onClick={saveLabel}
            >
              {labelState.isLoading ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button
              type="button"
              className="btn btn-outline btn-small"
              disabled={busy}
              onClick={() => {
                setTitle(label);
                setEditing(false);
              }}
            >
              Annuler
            </button>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <label className="btn btn-secondary btn-small cursor-pointer">
            {uploadState.isLoading ? "Envoi…" : url ? "Changer" : "Ajouter une photo"}
            <input
              type="file"
              accept="image/png,image/webp"
              className="sr-only"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) {
                  upload({ stage, slot, file });
                }
              }}
            />
          </label>
          {url ? (
            <button type="button" className="btn btn-outline btn-small" disabled={busy} onClick={() => remove({ stage, slot })}>
              Retirer
            </button>
          ) : null}
          {onCancel ? (
            <button type="button" className="btn btn-outline btn-small" disabled={busy} onClick={onCancel}>
              Annuler
            </button>
          ) : null}
        </div>
        {failure ? <p className="field-error">{errorMessage(failure)}</p> : null}
      </div>
    </div>
  );
}
