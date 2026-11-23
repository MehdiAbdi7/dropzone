"use client";

import Field from "@/components/ui/Field";
import { KIND_LABELS, OPTION_FIELDS } from "@/config/catalog";
import { formatPrice } from "@/lib/format";
import type { ProductKind } from "@/types/api";
import { useChoicesQuery } from "@/features/admin/api/choicesApi";
import ChoicePicker from "@/features/admin/products/ChoicePicker";
import ConditionSheet from "@/features/admin/products/ConditionSheet";
import ModelPicker from "@/features/admin/products/ModelPicker";
import { SectionHeading } from "@/features/admin/products/FormParts";
import type { VariantDraft } from "@/features/admin/products/productDraft";
import { emptyTradeIn, tradeInPrice, type TradeInDraft } from "./exchange";

// Ce que le client peut rendre : des appareils (pas d'accessoire, pas de montre).
const KINDS: ProductKind[] = ["phone", "tablet", "laptop"];

// Ce que le client donne (lot 5) : son téléphone. Le modèle est celui de NOTRE catalogue (obligatoire :
// l'affaire sera mise en vente sous lui), sa couleur, ses options, la fiche d'état complète d'une affaire,
// et le prix de reprise, SAISI À LA MAIN : c'est le magasin qui décide ce qu'il donne pour ce téléphone.
// `editing` (18/11) : on modifie une reprise déjà enregistrée, avant sa mise en vente. Le modèle et le prix de reprise
// ne changent plus (ils sont affichés), et une section « Remise en état » dit ce que la batterie neuve ou l'écran a
// coûté : ces frais s'ajoutent au prix d'achat de l'affaire.
// `noPrice` (étape 6) : l'appareil en panne d'un remplacement sous garantie n'a pas de prix de reprise (0 DA, fixé par le
// serveur) : la section du prix disparaît et les suivantes se renumérotent.
export default function TradeInForm({
  draft,
  onChange,
  editing = false,
  noPrice = false,
}: {
  draft: TradeInDraft;
  onChange: (draft: TradeInDraft) => void;
  editing?: boolean;
  noPrice?: boolean;
}) {
  const { data: choiceData } = useChoicesQuery();
  const { variant, kind } = draft;
  const id = (name: string) => `tradein-${name}`;
  const setVariant = (next: VariantDraft) => onChange({ ...draft, variant: next });
  const set = (patch: Partial<VariantDraft>) => setVariant({ ...variant, ...patch });
  const price = tradeInPrice(draft);

  // Les options de la sorte d'appareil (Stockage, RAM, SIM…) : la couleur a son propre champ, juste dessous.
  const fields = OPTION_FIELDS[kind].filter((field) => field.group !== "color");
  const multipleOf = (group: string) => choiceData?.lists.find((list) => list.group === group)?.multiple;

  return (
    <fieldset className="overflow-hidden rounded-xl border border-line bg-surface">
      <legend className="sr-only">Le téléphone du client</legend>
      <div className="divide-y divide-line">
        <section className="space-y-4 p-4 sm:p-5">
          <SectionHeading number="01" title="Son appareil" description="Un modèle de notre catalogue : l'occasion sera mise en vente sous lui." />
          <fieldset>
            <legend className="label">Sorte d&apos;appareil</legend>
            <div className="flex flex-wrap gap-2">
              {KINDS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className="chip"
                  aria-pressed={kind === value}
                  // Changer de sorte repart d'une reprise vierge : les options ne se ressemblent pas.
                  onClick={() => (value === kind ? undefined : onChange(emptyTradeIn(value)))}
                >
                  {KIND_LABELS[value]}
                </button>
              ))}
            </div>
          </fieldset>
          {editing ? (
            <p className="font-semibold">
              {draft.model?.brand} {draft.model?.name}
            </p>
          ) : (
            <ModelPicker
              kind={kind}
              value={draft.model?.id ?? null}
              onChange={(model) =>
                onChange({
                  ...draft,
                  model: { id: model.id, brand: model.brand, name: model.name, colors: model.colors },
                  // La couleur d'un autre modèle n'a plus de sens : elle est à rechoisir.
                  variant: { ...variant, options: { ...variant.options, Couleur: "" } },
                })
              }
            />
          )}
          <div className="grid gap-5 md:grid-cols-2">
            <ChoicePicker
              group="color"
              label="Couleur"
              {...(draft.model?.colors.length ? { only: draft.model.colors } : {})}
              value={variant.options.Couleur ?? ""}
              onChange={(value) => set({ options: { ...variant.options, Couleur: value } })}
            />
            {fields.map((field) =>
              multipleOf(field.group) ? (
                <ChoicePicker
                  key={field.key}
                  group={field.group}
                  label={field.key}
                  multiple
                  value={variant.options[field.key] ? variant.options[field.key].split(" · ") : []}
                  onChange={(value) => set({ options: { ...variant.options, [field.key]: value.join(" · ") } })}
                />
              ) : (
                <ChoicePicker
                  key={field.key}
                  group={field.group}
                  label={field.key}
                  value={variant.options[field.key] ?? ""}
                  onChange={(value) => set({ options: { ...variant.options, [field.key]: value } })}
                />
              ),
            )}
          </div>
        </section>

        {noPrice ? null : editing ? (
          <section className="space-y-4 bg-blue-soft/30 p-4 sm:p-5">
            <SectionHeading
              number="02"
              title="Remise en état"
              description="Batterie neuve, écran changé… : ce que cela a coûté s'ajoute au prix d'achat de l'occasion."
            />
            <p className="text-sm">Repris à {formatPrice(price)} (ce prix ne change pas).</p>
            <Field id={id("repair")} label="Frais de remise en état (DA)" hint="Laissez vide s'il n'y en a pas.">
              <input
                id={id("repair")}
                className="input w-full sm:w-64"
                inputMode="numeric"
                value={draft.repairCost}
                onChange={(event) => onChange({ ...draft, repairCost: event.target.value.replace(/\D/g, "") })}
              />
            </Field>
          </section>
        ) : (
          <section className="space-y-4 bg-blue-soft/30 p-4 sm:p-5">
            <SectionHeading
              number="02"
              title="Prix de reprise"
              description="Saisi à la main : c'est le prix que le magasin donne au client pour son téléphone."
            />
            <Field id={id("price")} label="Prix de reprise (DA)" hint="Il devient le prix d'achat de l'occasion quand elle sera mise en vente.">
              <input
                id={id("price")}
                className="input w-full sm:w-64"
                inputMode="numeric"
                value={draft.price}
                onChange={(event) => onChange({ ...draft, price: event.target.value.replace(/\D/g, "") })}
              />
            </Field>
            {!Number.isNaN(price) ? <p className="text-sm font-semibold">{formatPrice(price)} pour son téléphone</p> : null}
          </section>
        )}

        <section className="space-y-4 p-4 sm:p-5">
          <SectionHeading number={noPrice ? "02" : "03"} title="Garantie et origine" description="Ce que le magasin annoncera quand il revendra cette occasion." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={id("warranty")} label="Garantie (1 à 36 mois)">
              <input
                id={id("warranty")}
                className="input"
                inputMode="numeric"
                value={variant.warrantyMonths}
                onChange={(event) => set({ warrantyMonths: event.target.value.replace(/\D/g, "").slice(0, 2) })}
              />
            </Field>
            <ChoicePicker group="origin" label="Origine (facultatif)" value={variant.origin} onChange={(origin) => set({ origin })} />
          </div>
        </section>

        <ConditionSheet variant={variant} number={noPrice ? "03" : "04"} idOf={id} set={set} onChange={setVariant} />
      </div>
    </fieldset>
  );
}
