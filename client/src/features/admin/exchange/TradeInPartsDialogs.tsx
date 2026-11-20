"use client";

import { useState, type FormEvent } from "react";
import { useDismantleTradeInMutation, useUseTradeInPartMutation, type TradeInRow } from "@/features/admin/api/exchangeApi";
import { usePartsQuery } from "@/features/admin/api/partsApi";
import EditDialog from "@/features/admin/products/EditDialog";
import { errorMessage } from "@/lib/errors";
import { formatPrice } from "@/lib/format";
import { dismantleBody, usePartProblem, type SalvageLine } from "./tradeInPartsRules";

const digits = (text: string) => text.replace(/\D/g, "");
const nameOf = (tradeIn: TradeInRow) => `${tradeIn.deviceModel.brand} ${tradeIn.deviceModel.name}`;

// « Démonter pour pièces » (étape 6, cahier §8) : l'appareil en panne laissé par un remplacement sous garantie n'est plus
// réparable. On choisit les pièces récupérées ; elles entrent au stock de l'atelier à 0 DA l'unité et la reprise disparaît
// de cette liste. Le dire avant de valider : cela ne s'annule pas.
export function DismantleDialog({ open, tradeIn, onClose }: { open: boolean; tradeIn: TradeInRow; onClose: () => void }) {
  return (
    <EditDialog open={open} title={`Démonter pour pièces : ${nameOf(tradeIn)}`} size="sm" onClose={onClose} closeLabel="Annuler">
      <DismantleForm tradeIn={tradeIn} onDone={onClose} />
    </EditDialog>
  );
}

// Monté seulement fenêtre ouverte : les lignes repartent d'une seule ligne vide à chaque ouverture.
function DismantleForm({ tradeIn, onDone }: { tradeIn: TradeInRow; onDone: () => void }) {
  const [lines, setLines] = useState<SalvageLine[]>([{ partId: null, quantity: "" }]);
  const { data: parts } = usePartsQuery("");
  const [dismantle, { isLoading, error }] = useDismantleTradeInMutation();
  const body = dismantleBody(lines);

  const change = (index: number, patch: Partial<SalvageLine>) => setLines((current) => current.map((line, at) => (at === index ? { ...line, ...patch } : line)));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (body.error) return;
    try {
      await dismantle({ id: tradeIn.id, parts: body.parts }).unwrap();
      onDone();
    } catch {
      // L'erreur RTK Query est affichée sous le bouton ; la saisie reste telle quelle.
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <p className="text-sm text-ink-muted">
        Les pièces choisies entrent au stock de pièces à 0 DA l&apos;unité (le prix d&apos;achat moyen de la pièce baisse en conséquence). La reprise
        disparaît de cette liste : cela ne s&apos;annule pas.
      </p>
      <ul className="space-y-2">
        {lines.map((line, index) => (
          <li key={index} className="flex flex-wrap items-end gap-2">
            <label className="min-w-0 flex-1 basis-48 text-sm font-semibold">
              <span className="label">Pièce récupérée</span>
              <select
                className="input w-full"
                value={line.partId ?? ""}
                onChange={(event) => change(index, { partId: event.target.value === "" ? null : Number(event.target.value) })}
              >
                <option value="">Choisir…</option>
                {parts?.map((part) => (
                  <option key={part.id} value={part.id}>
                    {part.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="w-24 text-sm font-semibold">
              <span className="label">Quantité</span>
              <input className="input" inputMode="numeric" value={line.quantity} onChange={(event) => change(index, { quantity: digits(event.target.value) })} />
            </label>
            {lines.length > 1 ? (
              <button type="button" className="btn btn-secondary btn-small" onClick={() => setLines((current) => current.filter((_, at) => at !== index))}>
                Retirer
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-secondary btn-small" onClick={() => setLines((current) => [...current, { partId: null, quantity: "" }])}>
        + Une autre pièce
      </button>
      {body.error ? <p className="text-sm text-ink-muted">{body.error}</p> : null}
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={isLoading || body.error !== null}>
        {isLoading ? "Enregistrement…" : "Démonter et récupérer les pièces"}
      </button>
    </form>
  );
}

// « Utiliser une pièce » pour remettre la reprise en état : la pièce sort du stock et son prix d'achat s'ajoute aux frais de
// remise en état, donc au prix d'achat de l'affaire une fois en vente.
export function UsePartDialog({ open, tradeIn, onClose }: { open: boolean; tradeIn: TradeInRow; onClose: () => void }) {
  return (
    <EditDialog open={open} title={`Utiliser une pièce : ${nameOf(tradeIn)}`} size="sm" onClose={onClose} closeLabel="Annuler">
      <UsePartForm tradeIn={tradeIn} onDone={onClose} />
    </EditDialog>
  );
}

function UsePartForm({ tradeIn, onDone }: { tradeIn: TradeInRow; onDone: () => void }) {
  const [partId, setPartId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState("1");
  const { data: parts } = usePartsQuery("");
  const [spendPart, { isLoading, error }] = useUseTradeInPartMutation();
  const part = parts?.find((candidate) => candidate.id === partId) ?? null;
  const problem = usePartProblem(part, quantity);
  const cost = part && problem === null ? part.purchasePrice * Number(quantity) : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (problem || partId === null) return;
    try {
      await spendPart({ id: tradeIn.id, partId, quantity: Number(quantity) }).unwrap();
      onDone();
    } catch {
      // L'erreur RTK Query est affichée sous le bouton ; la saisie reste telle quelle.
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <p className="text-sm text-ink-muted">Frais de remise en état actuels : {formatPrice(tradeIn.repairCost)}.</p>
      <div className="grid gap-3 sm:grid-cols-[1fr_6rem]">
        <label className="text-sm font-semibold">
          <span className="label">Pièce</span>
          <select className="input w-full" value={partId ?? ""} onChange={(event) => setPartId(event.target.value === "" ? null : Number(event.target.value))}>
            <option value="">Choisir…</option>
            {parts?.map((candidate) => (
              <option key={candidate.id} value={candidate.id} disabled={candidate.stock === 0}>
                {candidate.name} ({candidate.stock} en stock)
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          <span className="label">Quantité</span>
          <input className="input" inputMode="numeric" value={quantity} onChange={(event) => setQuantity(digits(event.target.value))} />
        </label>
      </div>
      {cost !== null ? (
        <p className="rounded-md bg-surface-2 p-3 text-sm font-semibold" aria-live="polite">
          S&apos;ajoute aux frais : {formatPrice(cost)}, soit {formatPrice(tradeIn.repairCost + cost)} en tout.
        </p>
      ) : null}
      {problem ? <p className="text-sm text-ink-muted">{problem}</p> : null}
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={isLoading || problem !== null}>
        {isLoading ? "Enregistrement…" : "Utiliser la pièce"}
      </button>
    </form>
  );
}
