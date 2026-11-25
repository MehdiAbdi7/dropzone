"use client";

import { useState, type KeyboardEvent } from "react";
import Field from "@/components/ui/Field";
import { CONDITION_LABELS, OPTION_FIELDS, type ChoiceGroup } from "@/config/catalog";
import type { ProductKind } from "@/types/api";
import { formatPrice } from "@/lib/format";
import { useChoicesQuery } from "@/features/admin/api/choicesApi";
import { type GiftOption } from "@/features/admin/api/productsApi";
import ChoicePicker from "./ChoicePicker";
import ColorPhotoField from "./ColorPhotoField";
import ConditionSheet from "./ConditionSheet";
import GiftEditor from "./GiftEditor";
import VariantPhones from "./VariantPhones";
import { type VariantDraft, withCondition } from "./productDraft";
import { marginPercent, variantTabs, type VariantTabId } from "./variantTabs";

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

// Une phrase sous la barre d'onglets : ce qu'on règle ici.
const TAB_HINTS: Record<VariantTabId, string> = {
  features: "Les caractéristiques qui distinguent cette variante des autres : stockage, couleur, etc.",
  price: "Ce que le client paie, ce que tu as payé, et ce qu'il y a en rayon.",
  state: "L'état réel de l'occasion, tel que le client le verra sur la fiche.",
  refs: "Le suivi interne : références, garantie et origine.",
  gifts: "Un accessoire inclus avec cette variante, si besoin.",
};

// Une variante du formulaire, en cinq onglets (25/11) : Caractéristiques, Prix et stock, État (occasion seulement),
// Références, Cadeaux. Un seul onglet est visible, mais tous restent montés (attribut `hidden`) : ce qu'on a tapé ne
// se perd pas en changeant d'onglet. Un onglet qui a un manque (prix, boîte, garantie…) le dit par une pastille.
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
  const [chosenTab, setChosenTab] = useState<VariantTabId>("features");
  const set = (patch: Partial<VariantDraft>) => onChange({ ...variant, ...patch });
  const id = (name: string) => `${variant.key}-${name}`;
  const refurbished = variant.condition === "refurbished";
  const { data: choiceData } = useChoicesQuery();
  const customLists = choiceData?.lists.filter((list) => list.group === null && list.kinds.includes(kind)) ?? [];

  const tabs = variantTabs(variant, { lockedColor: Boolean(lockedColor) });
  // Une affaire repassée en neuf n'a plus d'onglet État : on retombe sur le premier onglet.
  const tab = tabs.some((item) => item.id === chosenTab) ? chosenTab : "features";
  const margin = marginPercent(variant.price, variant.purchasePrice);
  const color = lockedColor ?? variant.options.Couleur;

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const at = tabs.findIndex((item) => item.id === tab);
    const next = tabs[(at + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
    setChosenTab(next.id);
    document.getElementById(id(`tab-${next.id}`))?.focus();
  }

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
      <div className={`flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5 ${refurbished ? "bg-red-soft" : "bg-blue-soft"}`}>
        <div>
          <p className={`text-xs font-bold tracking-widest ${refurbished ? "text-red" : "text-blue-ink"}`}>
            VARIANTE {String(index + 1).padStart(2, "0")}
          </p>
          <p className="font-display text-lg font-bold">
            {refurbished ? "Occasion" : "Neuf scellé"}
            {variant.id ? null : <span className="ml-2 text-sm font-semibold text-blue-ink">· nouvelle</span>}
          </p>
        </div>
        {onRemove ? (
          <button type="button" className="btn btn-danger btn-small" onClick={onRemove}>
            Retirer cette variante
          </button>
        ) : null}
      </div>

      <div role="tablist" aria-label="Parties de la variante" className="flex gap-1 overflow-x-auto border-b border-line bg-surface-2/40 px-2 pt-2">
        {tabs.map((item) => {
          const active = item.id === tab;
          return (
            <button
              key={item.id}
              id={id(`tab-${item.id}`)}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={id(`panel-${item.id}`)}
              tabIndex={active ? 0 : -1}
              onClick={() => setChosenTab(item.id)}
              onKeyDown={onTabKeyDown}
              className={`flex shrink-0 items-center gap-2 rounded-t-lg border border-b-0 px-3 py-2 text-sm font-semibold transition-colors ${
                active ? "border-line bg-surface text-ink" : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {item.label}
              {item.problems.length > 0 ? (
                <span
                  aria-label={`À compléter : ${item.problems.join(", ")}`}
                  title={`À compléter : ${item.problems.join(", ")}`}
                  className="grid size-5 place-items-center rounded-full bg-amber text-xs font-bold text-on-brand"
                >
                  !
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <p className="px-4 pt-4 text-sm text-ink-muted sm:px-5">{TAB_HINTS[tab]}</p>

      <div className="p-4 sm:p-5">
        <div role="tabpanel" id={id("panel-features")} aria-labelledby={id("tab-features")} hidden={tab !== "features"} className="space-y-5">
          {canBeRefurbished ? (
            <fieldset>
              <legend className="label">État</legend>
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
          ) : null}

          {/* Une carte par option, alignées en haut : une liste de puces et une liste à recherche ne s'étirent plus l'une sur l'autre. */}
          <div className="grid items-start gap-3 md:grid-cols-2">
            {OPTION_FIELDS[kind].map((field) => (
              <div key={field.key} className="rounded-lg border border-line bg-surface-2/40 p-3">
                {field.group === "color" && lockedColor ? (
                  <>
                    <p className="label">{field.key}</p>
                    <p className="input flex items-center bg-surface-2 font-semibold">{lockedColor}</p>
                  </>
                ) : (
                  renderPicker(
                    {
                      key: field.key,
                      group: field.group,
                      multiple: choiceData?.lists.find((list) => list.group === field.group)?.multiple,
                    },
                    field.group === "color" ? modelColors : undefined,
                  )
                )}
              </div>
            ))}
            {customLists.map((list) => (
              <div key={list.id} className="rounded-lg border border-line bg-surface-2/40 p-3">
                {renderPicker({ key: list.name, listId: list.id, multiple: list.multiple })}
              </div>
            ))}
          </div>

          {/* Une taille d'écran (un verre) : ses téléphones. Une coque garde la compatibilité de sa fiche. */}
          {kind === "accessory" && variant.options["Taille de l'écran"] ? (
            <VariantPhones variant={variant} id={id("phones")} onChange={(ids) => set({ compatibleModelIds: ids })} />
          ) : null}

          {/* La photo suit la couleur : elle vient après le choix de la couleur, plus avant. */}
          {modelId ? (
            <div className="space-y-3 rounded-lg border border-line bg-blue-soft/30 p-3 sm:p-4">
              <h3 className="font-display font-bold">Photo de la couleur{color ? ` : ${color}` : ""}</h3>
              {color ? (
                <ColorPhotoField modelId={modelId} color={color} />
              ) : (
                <p className="text-sm text-ink-muted">Choisis d’abord une couleur ci-dessus pour gérer sa photo.</p>
              )}
            </div>
          ) : null}
        </div>

        <div role="tabpanel" id={id("panel-price")} aria-labelledby={id("tab-price")} hidden={tab !== "price"} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id={id("price")} label="Prix de vente TTC (DA)">
              <input
                id={id("price")}
                className="input"
                inputMode="numeric"
                value={variant.price}
                onChange={(event) => set({ price: event.target.value.replace(/\D/g, "") })}
              />
            </Field>
            <Field
              id={id("purchase")}
              label="Prix d'achat (DA)"
              hint="Facultatif. Visible par l'admin seulement : sert au calcul du bénéfice."
            >
              <input
                id={id("purchase")}
                className="input"
                inputMode="numeric"
                value={variant.purchasePrice}
                onChange={(event) => set({ purchasePrice: event.target.value.replace(/\D/g, "") })}
              />
            </Field>
            <Field id={id("stock")} label={refurbished ? "Stock de cette occasion" : "Stock"}>
              <input
                id={id("stock")}
                className="input"
                inputMode="numeric"
                value={variant.stock}
                onChange={(event) => set({ stock: event.target.value.replace(/\D/g, "") })}
              />
            </Field>
          </div>
          {/* La marge se lit en direct : plus besoin de la calculer de tête. */}
          {margin !== null ? (
            <p
              aria-live="polite"
              className={`rounded-lg border p-3 text-sm font-semibold ${margin < 0 ? "border-red bg-red-soft text-red" : "border-line bg-surface-2/40"}`}
            >
              {margin < 0 ? "Vendu sous le prix d'achat" : "Marge"} : {margin} % ({formatPrice(Number(variant.price) - Number(variant.purchasePrice))})
            </p>
          ) : null}
        </div>

        {refurbished ? (
          <div role="tabpanel" id={id("panel-state")} aria-labelledby={id("tab-state")} hidden={tab !== "state"}>
            <ConditionSheet variant={variant} idOf={id} set={set} onChange={onChange} />
          </div>
        ) : null}

        <div role="tabpanel" id={id("panel-refs")} aria-labelledby={id("tab-refs")} hidden={tab !== "refs"}>
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
        </div>

        {lockedColor ? null : (
          <div role="tabpanel" id={id("panel-gifts")} aria-labelledby={id("tab-gifts")} hidden={tab !== "gifts"}>
            <GiftEditor variant={variant} giftOptions={giftOptions} onChange={(gifts) => set({ gifts })} />
          </div>
        )}
      </div>
    </fieldset>
  );
}
