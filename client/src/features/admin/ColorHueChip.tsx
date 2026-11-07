"use client";

import { useState } from "react";
import { errorMessage } from "@/lib/errors";
import { useUpdateChoiceMutation, type Choice } from "./adminApi";

// Le gris proposé à une couleur qui n'a pas encore de teinte (une couleur ajoutée par l'import).
export const DEFAULT_HUE = "#808080";

// Une couleur de la liste « Couleurs » : sa teinte (le sélecteur natif du navigateur), son
// nom et le bouton pour la retirer. La teinte n'est enregistrée qu'au clic sur
// « Enregistrer » : le sélecteur envoie un événement à chaque mouvement de la souris, on
// n'envoie pas une requête à chacun.
export default function ColorHueChip({
  choice,
  onRemove,
}: {
  choice: Choice;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState(choice.hex ?? DEFAULT_HUE);
  const [update, { isLoading, error }] = useUpdateChoiceMutation();
  // Le bouton n'apparaît qu'après un vrai choix (pas pour le gris de départ).
  const changed = draft !== (choice.hex ?? DEFAULT_HUE);

  return (
    <li className="chip cursor-default">
      <label className="flex items-center gap-1.5">
        {/* aria-label : sans lui, un lecteur d'écran annonce la valeur (« #f47d3c »). */}
        <input
          type="color"
          aria-label={`Teinte de ${choice.label}`}
          className={`size-6 cursor-pointer rounded-full ${choice.hex ? "" : "outline-2 outline-dashed outline-red"}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        {choice.label}
      </label>
      {choice.hex ? null : (
        <span className="text-xs text-red">teinte à choisir</span>
      )}
      {changed ? (
        <button
          type="button"
          className="btn btn-primary btn-small min-h-7 px-2 py-0"
          disabled={isLoading}
          onClick={() => update({ id: choice.id, hex: draft })}
        >
          Enregistrer
        </button>
      ) : null}
      <button
        type="button"
        className="text-ink-muted hover:text-red"
        aria-label={`Retirer ${choice.label}`}
        onClick={onRemove}
      >
        ×
      </button>
      {error ? (
        <span className="field-error basis-full">{errorMessage(error)}</span>
      ) : null}
    </li>
  );
}
