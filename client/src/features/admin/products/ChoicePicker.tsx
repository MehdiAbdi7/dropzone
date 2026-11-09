"use client";

import { useId, useState, type KeyboardEvent } from "react";
import type { ChoiceGroup } from "@/config/catalog";
import { errorMessage } from "@/lib/errors";
import { useChoicesQuery, useCreateChoiceMutation } from "../adminApi";
import { DEFAULT_HUE } from "../ColorHueChip";
import { exactChoice, matchChoices } from "./choiceSearch";

type Selector =
  | { group: ChoiceGroup; listId?: never }
  | { group?: never; listId: number };
type Props = Selector & {
  label: string;
  // Les valeurs à proposer d'abord (les couleurs officielles du modèle) : en puces, les autres
  // se trouvent par la recherche.
  only?: string[];
} & (
  | { multiple?: false; value: string; onChange: (value: string) => void }
  | { multiple: true; value: string[]; onChange: (value: string[]) => void }
);

// Une liste courte reste en puces ; au-delà, la recherche (06/11 : les cartes graphiques
// s'affichaient toutes d'un coup et chargeaient la fenêtre).
const SHORT_LIST = 8;
// Les propositions affichées sous le champ.
const SUGGESTIONS = 8;

// Une liste du formulaire produit : les valeurs de la table `choices`, et l'ajout d'une valeur
// qui manque (elle entre dans la liste pour les produits suivants, et se choisit tout de suite).
export default function ChoicePicker(props: Props) {
  const { group, listId, label } = props;
  const inputId = useId();
  const inputListId = useId();
  const { data: choices } = useChoicesQuery();
  const [createChoice, { isLoading, error, reset }] = useCreateChoiceMutation();
  const [draft, setDraft] = useState("");
  // Une nouvelle couleur arrive avec sa teinte (pastille de la boutique, lueur de l'affiche).
  const [hue, setHue] = useState(DEFAULT_HUE);
  const [listOpen, setListOpen] = useState(false);
  const [active, setActive] = useState(0);
  const isColor = group === "color";

  const selected = props.multiple ? props.value : props.value ? [props.value] : [];
  const listKey = group ?? `list:${listId}`;
  const labels = (choices?.values[listKey] ?? choices?.[listKey] ?? []).map((choice) => choice.label);
  // Une valeur déjà sur la variante mais retirée de la liste reste visible.
  const all = [...labels, ...selected.filter((value) => !labels.includes(value))];
  const only = props.only ?? [];
  const condensed = only.length > 0 || all.length > SHORT_LIST;

  function toggle(value: string) {
    if (props.multiple) {
      props.onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
    } else {
      props.onChange(props.value === value ? "" : value);
    }
  }

  // Choisir une valeur de la liste (sans la décocher si elle l'est déjà).
  function pick(value: string) {
    if (!selected.includes(value)) {
      toggle(value);
    }
    setDraft("");
    setActive(0);
    // Une seule valeur possible : la liste se referme ; plusieurs : elle reste pour la suivante.
    if (!props.multiple) {
      setListOpen(false);
    }
  }

  async function add() {
    const value = draft.trim();
    if (!value) {
      return;
    }
    const known = exactChoice(all, value);
    if (known) {
      pick(known);
      return;
    }
    try {
      if (group === "color") {
        await createChoice({ group, label: value, hex: hue }).unwrap();
      } else if (group) {
        await createChoice({ group, label: value }).unwrap();
      } else if (listId !== undefined) {
        await createChoice({ listId, label: value }).unwrap();
      } else {
        return;
      }
      setHue(DEFAULT_HUE);
      pick(value);
    } catch {
      // Le message s'affiche sous le champ.
    }
  }

  // Les propositions : sans ce qui est déjà choisi, ni les puces des couleurs du modèle.
  const pool = all.filter((value) => !selected.includes(value) && !only.includes(value));
  const suggestions = matchChoices(pool, draft, SUGGESTIONS);
  const canAdd = draft.trim().length > 0 && !exactChoice(all, draft);
  // Les lignes de la liste, dans l'ordre des flèches : les valeurs, puis « Ajouter ».
  const rows = [...suggestions, ...(canAdd ? [null] : [])];
  const showList = listOpen && rows.length > 0;

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setListOpen(true);
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => (rows.length === 0 ? 0 : (current + step + rows.length) % rows.length));
    } else if (event.key === "Enter") {
      // Un vrai <form> imbriqué est interdit en HTML : Entrée ne doit pas envoyer la fiche.
      event.preventDefault();
      const row = showList ? rows[Math.min(active, rows.length - 1)] : undefined;
      if (row) {
        pick(row);
      } else {
        add();
      }
    } else if (event.key === "Escape" && listOpen) {
      // La fenêtre du formulaire se fermerait aussi : seule la liste se ferme.
      event.preventDefault();
      event.stopPropagation();
      setListOpen(false);
    }
  }

  const hueField = isColor ? (
    <label className="flex shrink-0 items-center">
      <input
        type="color"
        aria-label="Teinte de la nouvelle couleur"
        className="size-9 cursor-pointer rounded-lg"
        value={hue}
        onChange={(event) => setHue(event.target.value)}
      />
    </label>
  ) : null;

  if (!condensed) {
    // Liste courte : toutes les valeurs en puces, et un champ pour en ajouter une.
    return (
      <fieldset className="space-y-2">
        <legend className="label">{label}</legend>
        <div className="flex flex-wrap gap-2">
          {all.map((value) => (
            <button key={value} type="button" className="chip" aria-pressed={selected.includes(value)} onClick={() => toggle(value)}>
              {value}
            </button>
          ))}
        </div>
        <div className="flex max-w-sm gap-2">
          {hueField}
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
                event.preventDefault();
                add();
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

  return (
    <fieldset className="space-y-2">
      <legend className="label">{label}</legend>

      {/* Les couleurs du modèle en puces (peu nombreuses), puis ce qui est choisi. */}
      {only.length > 0 || selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {only.map((value) => (
            <button key={value} type="button" className="chip" aria-pressed={selected.includes(value)} onClick={() => toggle(value)}>
              {value}
            </button>
          ))}
          {selected
            .filter((value) => !only.includes(value))
            .map((value) => (
              <button
                key={value}
                type="button"
                className="chip"
                aria-pressed="true"
                aria-label={`Retirer ${value}`}
                onClick={() => toggle(value)}
              >
                {value} <span aria-hidden="true">×</span>
              </button>
            ))}
        </div>
      ) : null}

      <div className="relative max-w-sm">
        <div className="flex gap-2">
          {hueField}
          <label htmlFor={inputId} className="sr-only">
            Rechercher ou ajouter dans « {label} »
          </label>
          <input
            id={inputId}
            role="combobox"
            aria-expanded={showList}
            aria-controls={inputListId}
            aria-autocomplete="list"
            aria-activedescendant={showList ? `${inputListId}-${Math.min(active, rows.length - 1)}` : undefined}
            autoComplete="off"
            className="input min-h-9 py-1 text-sm"
            placeholder={`Rechercher ou ajouter (${all.length} valeurs)…`}
            value={draft}
            onFocus={() => setListOpen(true)}
            onBlur={() => setListOpen(false)}
            onChange={(event) => {
              setDraft(event.target.value);
              setActive(0);
              setListOpen(true);
              reset();
            }}
            onKeyDown={onKeyDown}
          />
        </div>
        {showList ? (
          <ul
            id={inputListId}
            role="listbox"
            aria-label={label}
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-[var(--shadow)]"
          >
            {rows.map((row, index) => (
              <li
                key={row ?? "__add"}
                id={`${inputListId}-${index}`}
                role="option"
                aria-selected={index === Math.min(active, rows.length - 1)}
                // mousedown avant le blur du champ : sans ça, la liste disparaît avant le clic.
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => (row ? pick(row) : add())}
                className={`cursor-pointer rounded-lg px-3 py-2 text-sm aria-selected:bg-surface-2 ${row ? "" : "font-semibold text-blue-ink"}`}
              >
                {row ?? (isLoading ? "Ajout…" : `Ajouter « ${draft.trim()} »`)}
              </li>
            ))}
            {!draft.trim() && pool.length > suggestions.length ? (
              <li role="presentation" className="px-3 py-1.5 text-xs text-ink-muted">
                {pool.length - suggestions.length} autres : tapez pour les trouver.
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
      {error ? <p className="field-error">{errorMessage(error)}</p> : null}
    </fieldset>
  );
}
