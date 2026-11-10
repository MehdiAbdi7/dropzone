"use client";

import { Fragment, useState } from "react";
import Field from "@/components/ui/Field";
import { CONDITION_LABELS, FAMILIES, OPTION_FIELDS, type ChoiceGroup } from "@/config/catalog";
import { formatPrice } from "@/lib/format";
import type { ProductKind } from "@/types/api";
import { useChoicesQuery } from "@/features/admin/api/choicesApi";
import { type GiftOption } from "@/features/admin/api/productsApi";
import ChoicePicker from "./ChoicePicker";
import ColorPhotoField from "./ColorPhotoField";
import { type PartOrigin, type VariantDraft, withCondition, withReplacedParts } from "./productDraft";

type Props = {
  variant: VariantDraft;
  index: number;
  kind: ProductKind;
  canBeRefurbished: boolean;
  giftOptions: GiftOption[];
  // Les couleurs officielles du modèle choisi : proposées en premier pour l'option Couleur.
  modelColors?: string[];
  // Le modèle choisi : la photo de la couleur de la variante s'envoie sous lui (06/11).
  modelId?: number | null;
  // La couleur imposée (page d'une couleur du Catalogue) : affichée, pas modifiable.
  lockedColor?: string;
  onChange: (variant: VariantDraft) => void;
  // Sans `onRemove` (ajout depuis la page d'une couleur), pas de bouton « Retirer ».
  onRemove?: () => void;
  onSuggestSku: () => void;
};

type ChoiceField = { key: string; multiple?: boolean } & (
  | { group: ChoiceGroup; listId?: never }
  | { group?: never; listId: number }
);

// Une variante du formulaire : neuf scellé ou affaire, ses options à cocher, son prix et
// son stock, la fiche d'une affaire (état, pièces d'origine ou compatibles, boîte,
// détails), et ses articles offerts.
export default function VariantEditor({
  variant,
  index,
  kind,
  canBeRefurbished,
  giftOptions,
  modelColors = [],
  modelId = null,
  lockedColor,
  onChange,
  onRemove,
  onSuggestSku,
}: Props) {
  const set = (patch: Partial<VariantDraft>) => onChange({ ...variant, ...patch });
  const id = (name: string) => `${variant.key}-${name}`;
  const refurbished = variant.condition === "refurbished";
  const { data: choiceData } = useChoicesQuery();
  const customLists = choiceData?.lists.filter((list) => list.group === null && list.kinds.includes(kind)) ?? [];
  const sectionNumber = (base: number) => String(base + (modelId ? 1 : 0)).padStart(2, "0");

  function renderPicker(field: ChoiceField, only?: string[]) {
    const savedValue = variant.options[field.key] ?? "";
    const selector = "group" in field && field.group ? { group: field.group } : { listId: field.listId };
    if (field.multiple) {
      return (
        <ChoicePicker
          key={field.key}
          {...selector}
          label={field.key}
          {...(only ? { only } : {})}
          multiple
          value={savedValue ? savedValue.split(" · ") : []}
          onChange={(value) => set({ options: { ...variant.options, [field.key]: value.join(" · ") } })}
        />
      );
    }
    return (
      <ChoicePicker
        key={field.key}
        {...selector}
        label={field.key}
        {...(only ? { only } : {})}
        value={savedValue}
        onChange={(value) => set({ options: { ...variant.options, [field.key]: value } })}
      />
    );
  }

  return (
    <fieldset className={`overflow-hidden rounded-xl border border-line bg-surface ${refurbished ? "neon-edge" : ""}`}>
      <legend className="sr-only">Variante {index + 1}</legend>
      <div className={`flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-5 ${refurbished ? "bg-red-soft" : "bg-blue-soft"}`}>
        <div>
          <p className={`text-xs font-bold tracking-widest ${refurbished ? "text-red" : "text-blue-ink"}`}>
            VARIANTE {String(index + 1).padStart(2, "0")}
          </p>
          <p className="mt-1 font-display text-lg font-bold">
            {refurbished ? "Affaire" : "Neuf scellé"}
            {variant.id ? null : <span className="ml-2 text-sm font-semibold text-blue-ink">· nouvelle</span>}
          </p>
        </div>
        {onRemove ? (
          <button type="button" className="btn btn-danger btn-small" onClick={onRemove}>
            Retirer cette variante
          </button>
        ) : null}
      </div>

      <div className="divide-y divide-line">
        {modelId ? (
          <section className="space-y-4 bg-blue-soft/30 p-4 sm:p-5">
            <SectionHeading
              number="01"
              title="Photo de la couleur"
              description="Ajoute ou modifie la photo associée à la couleur de cette variante."
            />
            {lockedColor ?? variant.options.Couleur ? (
              <ColorPhotoField modelId={modelId} color={lockedColor ?? variant.options.Couleur} />
            ) : (
              <p className="rounded-lg border border-line bg-surface p-3 text-sm text-ink-muted">
                Choisis d’abord une couleur dans « Options du produit » pour gérer sa photo.
              </p>
            )}
          </section>
        ) : null}

        {canBeRefurbished ? (
          <section className="space-y-3 p-4 sm:p-5">
            <SectionHeading number={sectionNumber(1)} title="État du produit" description="Choisis la condition de cette variante." />
            <fieldset>
              <legend className="sr-only">État</legend>
              <div className="flex flex-wrap gap-2">
                {(["new", "refurbished"] as const).map((condition) => (
                  <button
                    key={condition}
                    type="button"
                    className="chip"
                    aria-pressed={variant.condition === condition}
                    onClick={() => onChange(withCondition(variant, kind, condition))}
                  >
                    {CONDITION_LABELS[condition]}
                  </button>
                ))}
              </div>
            </fieldset>
          </section>
        ) : null}

        <section className="space-y-4 p-4 sm:p-5">
          <SectionHeading
            number={sectionNumber(canBeRefurbished ? 2 : 1)}
            title="Options du produit"
            description="Sélectionne les caractéristiques de cette combinaison."
          />
          <div className="grid gap-5 md:grid-cols-2">
            {OPTION_FIELDS[kind].map((field) =>
              field.group === "color" && lockedColor ? (
                <div key={field.key}>
                  <p className="label">{field.key}</p>
                  <p className="input flex items-center bg-surface-2 font-semibold">{lockedColor}</p>
                </div>
              ) : (
                renderPicker({
                  key: field.key,
                  group: field.group,
                  multiple: choiceData?.lists.find((list) => list.group === field.group)?.multiple,
                }, field.group === "color" ? modelColors : undefined)
              ),
            )}
            {customLists.map((list) => renderPicker({ key: list.name, listId: list.id, multiple: list.multiple }))}
          </div>
        </section>

        <section className="space-y-4 bg-surface-2/40 p-4 sm:p-5">
          <SectionHeading
            number={sectionNumber(canBeRefurbished ? 3 : 2)}
            title="Prix et stock"
            description="Définis le prix de vente et la quantité disponible."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={id("price")} label="Prix TTC (DA)">
              <input
                id={id("price")}
                className="input"
                inputMode="numeric"
                value={variant.price}
                onChange={(event) => set({ price: event.target.value.replace(/\D/g, "") })}
              />
            </Field>
            <Field id={id("stock")} label={refurbished ? "Stock de cette affaire" : "Stock"}>
              <input
                id={id("stock")}
                className="input"
                inputMode="numeric"
                value={variant.stock}
                onChange={(event) => set({ stock: event.target.value.replace(/\D/g, "") })}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4 p-4 sm:p-5">
          <SectionHeading
            number={sectionNumber(canBeRefurbished ? 4 : 3)}
            title="Références et garantie"
            description="Informations de suivi et d'origine."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={id("sku")} label="Référence (SKU)">
              <div className="flex gap-2">
                <input
                  id={id("sku")}
                  className="input uppercase"
                  value={variant.sku}
                  onChange={(event) => set({ sku: event.target.value.toUpperCase() })}
                />
                <button type="button" className="btn btn-secondary btn-small" onClick={onSuggestSku}>
                  Proposer
                </button>
              </div>
            </Field>
            <Field id={id("warranty")} label="Garantie (1 à 36 mois)">
              <input
                id={id("warranty")}
                className="input"
                inputMode="numeric"
                value={variant.warrantyMonths}
                onChange={(event) => set({ warrantyMonths: event.target.value.replace(/\D/g, "").slice(0, 2) })}
              />
            </Field>
            <Field id={id("reference")} label="Référence magasin (facultatif)">
              <input
                id={id("reference")}
                className="input uppercase"
                maxLength={20}
                value={variant.reference}
                onChange={(event) => set({ reference: event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "") })}
              />
            </Field>
            <ChoicePicker
              group="origin"
              label="Origine (facultatif)"
              value={variant.origin}
              onChange={(origin) => set({ origin })}
            />
          </div>
        </section>

        {refurbished ? (
          <section className="space-y-5 bg-red-soft/50 p-4 sm:p-5">
            <SectionHeading
              number={sectionNumber(canBeRefurbished ? 5 : 4)}
              title="Fiche d’état de l’affaire"
              description="Détaille l'état réel et le contenu de l'appareil."
            />
            <div className="grid gap-4 rounded-lg border border-line bg-surface p-4 sm:grid-cols-2">
              <Field id={id("grade")} label="Note d'état (sur 10, facultatif)">
                <select id={id("grade")} className="input" value={variant.grade} onChange={(event) => set({ grade: event.target.value })}>
                  <option value="">Choisir…</option>
                  {Array.from({ length: 10 }, (_, i) => 10 - i).map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}/10
                    </option>
                  ))}
                </select>
              </Field>
              <Field id={id("battery")} label="Santé de la batterie (%, facultatif)">
                <input
                  id={id("battery")}
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
            <Field id={id("details")} label="Détails pour le client (facultatif)" hint={`${variant.details.length}/200 caractères`}>
              <textarea
                id={id("details")}
                className="input"
                rows={2}
                maxLength={200}
                placeholder="Comme neuf, vendu avec sa boîte d'origine"
                value={variant.details}
                onChange={(event) => set({ details: event.target.value })}
              />
            </Field>
          </section>
        ) : null}

        {lockedColor ? null : (
          <section className="space-y-4 bg-surface-2/40 p-4 sm:p-5">
            <SectionHeading
              number={sectionNumber(refurbished ? 6 : canBeRefurbished ? 5 : 4)}
              title="Articles offerts"
              description="Ajoute un accessoire inclus avec cette variante, si nécessaire."
            />
            <GiftEditor variant={variant} giftOptions={giftOptions} onChange={(gifts) => set({ gifts })} />
          </section>
        )}
      </div>

    </fieldset>
  );
}

const ORIGIN_LABELS: Record<PartOrigin, string> = { origine: "D'origine", compatible: "Compatible" };

function SectionHeading({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-line pb-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-soft text-xs font-bold text-blue-ink">
        {number}
      </span>
      <div>
        <h3 className="font-display font-bold">{title}</h3>
        <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
      </div>
    </div>
  );
}

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

// Les articles offerts : pris dans les accessoires du catalogue (GET /admin/gift-options).
function GiftEditor({
  variant,
  giftOptions,
  onChange,
}: {
  variant: VariantDraft;
  giftOptions: GiftOption[];
  onChange: (gifts: VariantDraft["gifts"]) => void;
}) {
  const [choice, setChoice] = useState("");
  const labelOf = (id: number) => giftOptions.find((option) => option.id === id);
  const available = giftOptions.filter((option) => !variant.gifts.some((gift) => gift.giftVariantId === option.id));

  return (
    <div className="space-y-3">
      {variant.gifts.length === 0 ? <p className="text-sm text-ink-muted">Aucun article offert.</p> : null}
      <ul className="space-y-2">
        {variant.gifts.map((gift) => {
          const option = labelOf(gift.giftVariantId);
          return (
            <li key={gift.giftVariantId} className="flex flex-wrap items-center gap-3 text-sm">
              <span className="flex-1">
                {option ? `${option.label}, ${formatPrice(option.price)} (stock ${option.stock})` : `Article n° ${gift.giftVariantId}`}
              </span>
              <label className="flex items-center gap-2">
                Quantité
                <input
                  className="input min-h-9 w-16 py-1"
                  inputMode="numeric"
                  value={gift.quantity}
                  onChange={(event) =>
                    onChange(
                      variant.gifts.map((g) =>
                        g.giftVariantId === gift.giftVariantId
                          ? { ...g, quantity: Math.max(1, Math.min(5, Number(event.target.value) || 1)) }
                          : g,
                      ),
                    )
                  }
                />
              </label>
              <button
                type="button"
                className="text-red underline"
                onClick={() => onChange(variant.gifts.filter((g) => g.giftVariantId !== gift.giftVariantId))}
              >
                Retirer
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex max-w-xl gap-2">
        <label htmlFor={`${variant.key}-gift`} className="sr-only">
          Article à offrir
        </label>
        <select id={`${variant.key}-gift`} className="input" value={choice} onChange={(event) => setChoice(event.target.value)}>
          <option value="">Choisir un accessoire à offrir…</option>
          {available.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label} ({formatPrice(option.price)}, stock {option.stock})
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          disabled={!choice}
          onClick={() => {
            onChange([...variant.gifts, { giftVariantId: Number(choice), quantity: 1 }]);
            setChoice("");
          }}
        >
          Offrir
        </button>
      </div>
    </div>
  );
}
