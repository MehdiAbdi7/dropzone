"use client";

import { useState } from "react";
import { usePartsQuery } from "@/features/admin/api/partsApi";
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

// Ajouter une pièce du stock : les pièces épuisées sont grisées et ne se choisissent pas (une pièce à 0 « ne peut
// pas entrer dans une réparation »).
function AddPart({ repair }: { repair: RepairDetail }) {
  const seesCost = repairCapabilities(useAdminRole()).seesPartCost;
  const { data: parts } = usePartsQuery("");
  const [add, adding] = useAddRepairPartMutation();
  const [partId, setPartId] = useState("");
  const [quantity, setQuantity] = useState("1");

  const count = Number(quantity);
  const valid = partId !== "" && Number.isInteger(count) && count >= 1 && count <= 100;

  async function submit() {
    if (!valid) return;
    try {
      await add({ id: repair.id, partId: Number(partId), quantity: count }).unwrap();
      setPartId("");
      setQuantity("1");
    } catch {
      // L'erreur RTK Query est affichée sous le bouton ; la sélection reste telle quelle.
    }
  }

  return (
    <div className="space-y-2 border-t border-line pt-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="block min-w-0 flex-1 text-sm font-semibold">
          <span className="label">Ajouter une pièce</span>
          <select className="input" value={partId} onChange={(event) => setPartId(event.target.value)}>
            <option value="">Choisir une pièce…</option>
            {parts?.map((part) => (
              <option key={part.id} value={part.id} disabled={part.stock === 0}>
                {part.name} · {seesCost ? `achat ${formatPrice(part.purchasePrice)}` : formatPrice(part.salePrice)} · {part.stock === 0 ? "épuisée" : `${part.stock} en stock`}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          <span className="label">Quantité</span>
          <input className="input w-20" inputMode="numeric" value={quantity} onChange={(event) => setQuantity(event.target.value.replace(/\D/g, ""))} />
        </label>
        <button type="button" className="btn btn-primary" disabled={!valid || adding.isLoading} onClick={submit}>
          {adding.isLoading ? "Ajout…" : "Ajouter"}
        </button>
      </div>
      {adding.error ? (
        <p role="alert" className="field-error">
          {errorMessage(adding.error)}
        </p>
      ) : null}
    </div>
  );
}
