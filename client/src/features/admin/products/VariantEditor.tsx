"use client";

import Field from "@/components/ui/Field";
import { CONDITION_LABELS, OPTION_FIELDS, type ChoiceGroup } from "@/config/catalog";
import type { ProductKind } from "@/types/api";
import { useChoicesQuery } from "@/features/admin/api/choicesApi";
import { type GiftOption } from "@/features/admin/api/productsApi";
import ChoicePicker from "./ChoicePicker";
import ColorPhotoField from "./ColorPhotoField";
import ConditionSheet from "./ConditionSheet";
import { SectionHeading } from "./FormParts";
import GiftEditor from "./GiftEditor";
import VariantPhones from "./VariantPhones";
import { type VariantDraft, withCondition } from "./productDraft";

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
// son stock, la fiche d'une affaire (ConditionSheet), et ses articles offerts (GiftEditor).
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
          {kind === "accessory" ? <VariantPhones variant={variant} id={id("phones")} onChange={(ids) => set({ compatibleModelIds: ids })} /> : null}
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
          <ConditionSheet
            variant={variant}
            number={sectionNumber(canBeRefurbished ? 5 : 4)}
            idOf={id}
            set={set}
            onChange={onChange}
          />
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
