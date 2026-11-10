"use client";

import { Fragment } from "react";
import Field from "@/components/ui/Field";
import { FAMILIES } from "@/config/catalog";
import ChoicePicker from "./ChoicePicker";
import { SectionHeading } from "./FormParts";
import { type PartOrigin, type VariantDraft, withReplacedParts } from "./productDraft";

const ORIGIN_LABELS: Record<PartOrigin, string> = { origine: "D'origine", compatible: "Compatible" };

// Pour chaque pièce changée : d'origine ou compatible. Rien n'est choisi au départ ; le
// formulaire refuse l'envoi tant qu'une pièce n'a pas son choix.
function PartOriginPicker({
  variant,
  onChange,
}: {
  variant: VariantDraft;
  onChange: (partOrigins: VariantDraft["partOrigins"]) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="label">Origine des pièces changées</legend>
      {variant.replacedParts.map((part) => (
        <div key={part} role="group" aria-label={part} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="min-w-28 font-semibold">{part}</span>
          {(["origine", "compatible"] as const).map((origin) => (
            <button
              key={origin}
              type="button"
              className="chip"
              aria-pressed={variant.partOrigins[part] === origin}
              onClick={() => onChange({ ...variant.partOrigins, [part]: origin })}
            >
              {ORIGIN_LABELS[origin]}
            </button>
          ))}
        </div>
      ))}
    </fieldset>
  );
}

// La fiche d'état d'une affaire : note, batterie, pièces changées, défauts, limitations,
// boîte d'origine et détails pour le client.
export default function ConditionSheet({
  variant,
  number,
  idOf,
  set,
  onChange,
}: {
  variant: VariantDraft;
  // Le numéro de la section dans la fenêtre de la variante (« 05 »).
  number: string;
  // L'identifiant d'un champ, unique à cette variante (pour les <label htmlFor>).
  idOf: (name: string) => string;
  set: (patch: Partial<VariantDraft>) => void;
  onChange: (variant: VariantDraft) => void;
}) {
  return (
    <section className="space-y-5 bg-red-soft/50 p-4 sm:p-5">
      <SectionHeading
        number={number}
        title="Fiche d’état de l’affaire"
        description="Détaille l'état réel et le contenu de l'appareil."
      />
      <div className="grid gap-4 rounded-lg border border-line bg-surface p-4 sm:grid-cols-2">
        <Field id={idOf("grade")} label="Note d'état (sur 10, facultatif)">
          <select id={idOf("grade")} className="input" value={variant.grade} onChange={(event) => set({ grade: event.target.value })}>
            <option value="">Choisir…</option>
            {Array.from({ length: 10 }, (_, i) => 10 - i).map((grade) => (
              <option key={grade} value={grade}>
                {grade}/10
              </option>
            ))}
          </select>
        </Field>
        <Field id={idOf("battery")} label="Santé de la batterie (%, facultatif)">
          <input
            id={idOf("battery")}
            className="input"
            inputMode="numeric"
            value={variant.batteryHealth}
            onChange={(event) => set({ batteryHealth: event.target.value.replace(/\D/g, "").slice(0, 3) })}
          />
        </Field>
      </div>
      {FAMILIES.map((family) => (
        <Fragment key={family.field}>
          <ChoicePicker
            multiple
            group={family.group}
            label={family.label}
            value={variant[family.field]}
            onChange={(values) =>
              family.field === "replacedParts"
                ? onChange(withReplacedParts(variant, values))
                : set({ [family.field]: values })
            }
          />
          {family.field === "replacedParts" && variant.replacedParts.length > 0 ? (
            <div className="rounded-lg border border-line bg-surface p-4">
              <PartOriginPicker variant={variant} onChange={(partOrigins) => set({ partOrigins })} />
            </div>
          ) : null}
        </Fragment>
      ))}
      <fieldset className="space-y-2 rounded-lg border border-line bg-surface p-4">
        <legend className="label px-1">Boîte d&apos;origine</legend>
        {variant.withBox === null ? (
          <p role="note" className="rounded-lg border border-amber bg-amber-soft p-3 text-sm font-semibold">
            Boîte non précisée (annonce importée) : à corriger.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {([true, false] as const).map((withBox) => (
            <button
              key={String(withBox)}
              type="button"
              className="chip"
              aria-pressed={variant.withBox === withBox}
              onClick={() => set({ withBox })}
            >
              {withBox ? "Avec sa boîte" : "Sans boîte"}
            </button>
          ))}
        </div>
      </fieldset>
      <Field id={idOf("details")} label="Détails pour le client (facultatif)" hint={`${variant.details.length}/200 caractères`}>
        <textarea
          id={idOf("details")}
          className="input"
          rows={2}
          maxLength={200}
          placeholder="Comme neuf, vendu avec sa boîte d'origine"
          value={variant.details}
          onChange={(event) => set({ details: event.target.value })}
        />
      </Field>
    </section>
  );
}
