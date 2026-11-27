"use client";

import { useState, type FormEvent } from "react";
import { useAddVariantArrivalMutation, useAdminProductQuery, useVariantArrivalsQuery, type VariantArrivalResult } from "@/features/admin/api/productsApi";
import { Cost, CostInput } from "@/features/admin/costs/CostGuard";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatPrice } from "@/lib/format";
import EditDialog from "./EditDialog";
import { arrivalBody, arrivalPreview, arrivalProblem, emptyArrival, needsCurrentCost } from "./variantArrival";

const digits = (text: string) => text.replace(/\D/g, "");

// « + Arrivage » d'un neuf (27/11, demande de Mehdi) : du stock reçu à un autre prix d'achat. Un iPhone neuf acheté 350 000 DA,
// puis 340 000 DA, reste UNE variante : son stock augmente et son prix d'achat devient la moyenne pondérée, qu'on montre avant de
// valider. L'arrivage part tout de suite à l'API, sans attendre « Enregistrer » ; le prix de vente ne bouge pas, ni le bénéfice des
// ventes déjà faites (chaque vente a figé son prix d'achat). Les prix d'achat restent derrière le code.
export default function VariantArrivalDialog({
  open,
  variantId,
  productId,
  onClose,
  onDone,
}: {
  open: boolean;
  variantId: number;
  productId: number;
  onClose: () => void;
  // Appelé avec le stock et le prix d'achat moyen d'après : la fiche ouverte met ses champs à jour.
  onDone: (result: VariantArrivalResult) => void;
}) {
  return (
    <EditDialog open={open} title="Arrivage" size="sm" onClose={onClose} closeLabel="Annuler">
      {/* Monté fenêtre ouverte : le formulaire repart vide à chaque ouverture. */}
      {open ? <ArrivalForm variantId={variantId} productId={productId} onDone={onDone} /> : null}
    </EditDialog>
  );
}

function ArrivalForm({ variantId, productId, onDone }: { variantId: number; productId: number; onDone: (result: VariantArrivalResult) => void }) {
  // L'état ENREGISTRÉ de la variante (celui que l'API verrouille et moyenne), pas ce qui est tapé dans la fiche.
  const { data: product } = useAdminProductQuery(productId);
  const saved = product?.variants.find((variant) => variant.id === variantId);
  const { data: history } = useVariantArrivalsQuery(variantId);
  const [draft, setDraft] = useState(emptyArrival);
  const [add, { isLoading, error }] = useAddVariantArrivalMutation();

  if (!saved) {
    return <p className="text-ink-muted">Chargement…</p>;
  }
  const now = { stock: saved.stock, purchasePrice: saved.purchasePrice };
  const problem = arrivalProblem(now, draft);
  const preview = arrivalPreview(now, draft);
  // Les prix de ce formulaire se débloquent ensemble : on tape le prix d'achat pour en lire la moyenne.
  const key = `arrival:${variantId}`;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (problem) return;
    try {
      const result = await add({ productId, variantId, ...arrivalBody(now, draft) }).unwrap();
      onDone(result);
    } catch {
      // L'erreur RTK Query est affichée sous le bouton ; la saisie reste telle quelle.
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <p className="text-sm text-ink-muted">
          En stock : {saved.stock} · prix d&apos;achat actuel :{" "}
          {saved.purchasePrice === null ? "non renseigné" : <Cost id={key}>{formatPrice(saved.purchasePrice)}</Cost>}
        </p>
        <p className="text-sm text-ink-muted">
          Du stock reçu à un autre prix reste la même variante : son prix d&apos;achat devient la moyenne, et le prix de vente ne change pas.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            <span className="label">Quantité reçue</span>
            <input
              className="input"
              inputMode="numeric"
              value={draft.quantity}
              onChange={(event) => setDraft({ ...draft, quantity: digits(event.target.value) })}
            />
          </label>
          <label className="block text-sm font-semibold">
            <span className="label">Prix d&apos;achat unitaire (DA)</span>
            <CostInput revealKey={key} value={draft.unitCost} onChange={(unitCost) => setDraft({ ...draft, unitCost })} />
          </label>
        </div>
        {needsCurrentCost(now) ? (
          <label className="block text-sm font-semibold">
            <span className="label">Prix d&apos;achat du stock actuel (DA)</span>
            <CostInput revealKey={key} value={draft.currentUnitCost} onChange={(currentUnitCost) => setDraft({ ...draft, currentUnitCost })} />
            <span className="mt-1 block text-xs font-normal text-ink-muted">
              Il n&apos;est pas renseigné sur cette variante : sans lui, la moyenne n&apos;aurait pas de sens.
            </span>
          </label>
        ) : null}
        {preview ? (
          <p className="rounded-md bg-surface-2 p-3 text-sm font-semibold" aria-live="polite">
            Après l&apos;arrivage : {preview.stock} en stock, prix d&apos;achat moyen <Cost id={key}>{formatPrice(preview.average)}</Cost>.
          </p>
        ) : null}
        {draft.quantity !== "" && problem ? <p className="text-sm text-ink-muted">{problem}</p> : null}
        {error ? (
          <p role="alert" className="field-error">
            {errorMessage(error)}
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={isLoading || problem !== null}>
          {isLoading ? "Enregistrement…" : "Enregistrer l'arrivage"}
        </button>
      </form>

      {history && history.length > 0 ? (
        <section aria-label="Arrivages précédents" className="space-y-2 border-t border-line pt-4">
          <h3 className="label">Arrivages précédents</h3>
          <ul className="space-y-2">
            {history.map((arrival) => (
              <li key={arrival.id} className="rounded-lg bg-surface-2 p-3 text-sm">
                <p className="flex flex-wrap items-baseline justify-between gap-2 font-semibold">
                  <span>+{arrival.quantity} reçus</span>
                  <span className="tabular-nums">En stock : {arrival.stockAfter}</span>
                </p>
                <p className="text-ink-muted">
                  {formatDate(arrival.createdAt)} · à <Cost>{formatPrice(arrival.unitCost)}</Cost> l&apos;unité · prix moyen après :{" "}
                  <Cost>{formatPrice(arrival.costAfter)}</Cost>
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
