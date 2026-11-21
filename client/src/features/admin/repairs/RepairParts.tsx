"use client";

import { useState } from "react";
import { usePartCategoriesQuery, usePartsQuery } from "@/features/admin/api/partsApi";
import { activeCategoryId, visibleParts } from "@/features/admin/parts/partsView";
import {
  useAddRepairPartMutation,
  useRemoveRepairPartMutation,
  useUpdateRepairPartMutation,
  type RepairDetail,
  type RepairLine,
} from "@/features/admin/api/repairsApi";
import { useAdminRole } from "@/features/admin/AdminRoleContext";
import { errorMessage } from "@/lib/errors";
import { repairCapabilities } from "./repairsView";
import { formatPrice } from "@/lib/format";

// Les pièces d'une fiche : chaque ligne garde le nom et les prix de la pièce AU MOMENT où elle a été ajoutée. Une
// pièce « sortie du stock » est déjà retirée du stock (la fiche est passée « En réparation »). Les lignes ne
// changent plus quand l'appareil est prêt, à rendre ou rendu.
export default function RepairParts({ repair }: { repair: RepairDetail }) {
  const caps = repairCapabilities(useAdminRole());
  const editable = repair.status === "received" || repair.status === "quote" || repair.status === "in_repair";
  const [update, updating] = useUpdateRepairPartMutation();
  const [remove, removing] = useRemoveRepairPartMutation();
  const error = updating.error ?? removing.error;

  return (
    <section className="space-y-3" aria-label="Pièces de la réparation">
      <h3 className="text-lg">Pièces</h3>
      {repair.parts.length === 0 ? <p className="text-sm text-ink-muted">Aucune pièce pour l&apos;instant.</p> : null}
      <ul className="space-y-2">
        {repair.parts.map((line) => (
          <Line
            key={line.id}
            line={line}
            editable={editable}
            priceText={caps.seesClientMoney ? `${formatPrice(line.unitPrice)} l'unité` : caps.seesPartCost ? `Achat : ${formatPrice(line.unitCost)} l'unité` : ""}
            busy={updating.isLoading || removing.isLoading}
            onQuantity={(quantity) => update({ id: repair.id, lineId: line.id, quantity })}
            onRemove={() => remove({ id: repair.id, lineId: line.id })}
          />
        ))}
      </ul>
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
      {editable ? <AddPart repair={repair} /> : null}
    </section>
  );
}

function Line({
  line,
  editable,
  priceText,
  busy,
  onQuantity,
  onRemove,
}: {
  line: RepairLine;
  editable: boolean;
  priceText: string;
  busy: boolean;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface-2 p-3">
      <p className="min-w-0 font-semibold">
        {line.name}
        <span className="block text-sm font-normal text-ink-muted">
          {priceText}
          {priceText && line.consumed ? " · " : ""}
          {line.consumed ? "sortie du stock" : ""}
        </span>
      </p>
      <div className="flex items-center gap-2">
        {editable ? (
          <>
            <button type="button" className="btn btn-secondary btn-small" disabled={busy || line.quantity <= 1} aria-label={`Une ${line.name} de moins`} onClick={() => onQuantity(line.quantity - 1)}>
              −
            </button>
            <span className="min-w-6 text-center font-bold tabular-nums">{line.quantity}</span>
            <button type="button" className="btn btn-secondary btn-small" disabled={busy || line.quantity >= 100} aria-label={`Une ${line.name} de plus`} onClick={() => onQuantity(line.quantity + 1)}>
              +
            </button>
            <button type="button" className="btn btn-secondary btn-small" disabled={busy} onClick={onRemove}>
              Retirer
            </button>
          </>
        ) : (
          <span className="font-bold tabular-nums">× {line.quantity}</span>
        )}
      </div>
    </li>
  );
}

// Ajouter une pièce du stock, en deux temps comme sur la page Pièces (21/11) : on clique la catégorie (Batterie,
// Afficheur…), puis le bouton « Ajouter » de la pièce voulue ; une barre de recherche trouve une pièce dans toutes les
// catégories. Chaque clic ajoute UNE pièce ; la quantité se règle ensuite avec − et + sur sa ligne. Les pièces
// épuisées sont grisées et ne s'ajoutent pas (une pièce à 0 « ne peut pas entrer dans une réparation »).
function AddPart({ repair }: { repair: RepairDetail }) {
  const seesCost = repairCapabilities(useAdminRole()).seesPartCost;
  const { data: parts } = usePartsQuery("");
  const { data: categories } = usePartCategoriesQuery();
  const [add, adding] = useAddRepairPartMutation();
  const [wanted, setWanted] = useState<number | null>(null);
  const [text, setText] = useState("");
  // La pièce en cours d'ajout : son bouton est seul grisé, les autres restent utilisables.
  const [pending, setPending] = useState<number | null>(null);

  const active = activeCategoryId(categories ?? [], wanted);
  const searching = text.trim() !== "";
  const shown = visibleParts(parts ?? [], active, text);
  const categoryName = (id: number) => categories?.find((category) => category.id === id)?.name;
  const quantityInRepair = (partId: number) => repair.parts.find((line) => line.partId === partId)?.quantity ?? 0;

  async function addOne(partId: number) {
    setPending(partId);
    try {
      await add({ id: repair.id, partId, quantity: 1 }).unwrap();
    } catch {
      // L'erreur RTK Query est affichée sous la liste.
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-3 border-t border-line pt-3">
      <h4 className="label">Ajouter une pièce</h4>
      {categories?.length ? (
        // Une rangée qui défile sur téléphone, à la ligne dès 768 px (comme la page Pièces).
        <div role="group" aria-label="Catégories de pièces" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] md:flex-wrap md:overflow-visible md:pb-0">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className="chip shrink-0 whitespace-nowrap"
              aria-pressed={!searching && active === category.id}
              onClick={() => {
                setWanted(category.id);
                setText("");
              }}
            >
              {category.name}
            </button>
          ))}
        </div>
      ) : null}
      <label className="block">
        <span className="sr-only">Chercher une pièce</span>
        <input className="input" type="search" autoComplete="off" maxLength={60} placeholder="Chercher une pièce…" value={text} onChange={(event) => setText(event.target.value)} />
      </label>

      {parts && categories ? (
        shown.length ? (
          <ul className="max-h-72 divide-y divide-line overflow-y-auto rounded-lg border border-line">
            {shown.map((part) => {
              const inRepair = quantityInRepair(part.id);
              return (
                <li key={part.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    {searching ? <p className="text-xs font-semibold uppercase tracking-wide text-blue-ink">{categoryName(part.categoryId)}</p> : null}
                    <p className="font-semibold leading-snug">{part.name}</p>
                    <p className="text-xs text-ink-muted">
                      {seesCost ? `Achat ${formatPrice(part.purchasePrice)} · Vente ${formatPrice(part.salePrice)}` : formatPrice(part.salePrice)} ·{" "}
                      {part.stock === 0 ? <span className="font-bold text-red">Épuisée</span> : `${part.stock} en stock`}
                      {inRepair > 0 ? ` · déjà ${inRepair} dans la fiche` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-small shrink-0"
                    disabled={part.stock === 0 || pending !== null}
                    aria-label={`Ajouter ${part.name}`}
                    onClick={() => addOne(part.id)}
                  >
                    {pending === part.id ? "Ajout…" : "+ Ajouter"}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">{searching ? "Aucune pièce ne correspond à cette recherche." : "Aucune pièce dans cette catégorie."}</p>
        )
      ) : (
        <p className="text-sm text-ink-muted">Chargement…</p>
      )}

      {adding.error ? (
        <p role="alert" className="field-error">
          {errorMessage(adding.error)}
        </p>
      ) : null}
    </div>
  );
}
