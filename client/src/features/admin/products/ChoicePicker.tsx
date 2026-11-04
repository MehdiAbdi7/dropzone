"use client";

import { useId, useState } from "react";
import type { ChoiceGroup } from "@/config/catalog";
import { errorMessage } from "@/lib/errors";
import { useChoicesQuery, useCreateChoiceMutation } from "../adminApi";
import { DEFAULT_HUE } from "../ColorHueChip";

type Props = {
  group: ChoiceGroup;
  label: string;
} & (
  | { multiple?: false; value: string; onChange: (value: string) => void }
  | { multiple: true; value: string[]; onChange: (value: string[]) => void }
);

// Une liste à cocher du formulaire produit : les valeurs de la table `choices`
// sous forme de puces, et un champ pour ajouter une valeur qui manque. La nouvelle
// valeur entre dans la liste (pour les produits suivants) et se coche tout de suite.
export default function ChoicePicker(props: Props) {
  const { group, label } = props;
  const inputId = useId();
  const { data: choices } = useChoicesQuery();
  const [createChoice, { isLoading, error, reset }] = useCreateChoiceMutation();
  const [draft, setDraft] = useState("");
  // Une nouvelle couleur arrive avec sa teinte (pastille de la boutique, lueur de l'affiche).
  const [hue, setHue] = useState(DEFAULT_HUE);
  const isColor = group === "color";

  const selected = props.multiple ? props.value : props.value ? [props.value] : [];
  const labels = (choices?.[group] ?? []).map((choice) => choice.label);
  // Une valeur déjà sur la variante mais retirée de la liste reste visible.
  const all = [...labels, ...selected.filter((value) => !labels.includes(value))];

  function toggle(value: string) {
    if (props.multiple) {
      props.onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
    } else {
      props.onChange(props.value === value ? "" : value);
    }
  }

  // Appelée par le bouton et par la touche Entrée (sans envoyer le formulaire produit).
  async function add(event: { preventDefault: () => void }) {
    event.preventDefault();
    const value = draft.trim();
    if (!value) {
      return;
    }
    try {
      if (!labels.includes(value)) {
        await createChoice(isColor ? { group, label: value, hex: hue } : { group, label: value }).unwrap();
      }
      setDraft("");
      setHue(DEFAULT_HUE);
      if (!selected.includes(value)) {
        toggle(value);
      }
    } catch {
      // Le message s'affiche sous le champ.
    }
  }

  return (
    <fieldset className="space-y-2">
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {all.map((value) => (
          <button
            key={value}
            type="button"
            className="chip"
            aria-pressed={selected.includes(value)}
            onClick={() => toggle(value)}
          >
            {value}
          </button>
        ))}
      </div>
      {/* Un vrai <form> imbriqué est interdit en HTML : on gère Entrée à la main. */}
      <div className="flex max-w-sm gap-2">
        {isColor ? (
          <label className="flex items-center">
            <input
              type="color"
              aria-label="Teinte de la nouvelle couleur"
              className="size-9 cursor-pointer rounded-lg"
              value={hue}
              onChange={(event) => setHue(event.target.value)}
            />
          </label>
        ) : null}
        <label htmlFor={inputId} className="sr-only">
          Ajouter à « {label} »
        </label>
        <input
          id={inputId}
          className="input min-h-9 py-1 text-sm"
          placeholder="Ajouter une valeur…"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            reset();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              add(event);
            }
          }}
        />
        <button type="button" className="btn btn-secondary btn-small" onClick={add} disabled={isLoading || !draft.trim()}>
          Ajouter
        </button>
      </div>
      {error ? <p className="field-error">{errorMessage(error)}</p> : null}
    </fieldset>
  );
}
