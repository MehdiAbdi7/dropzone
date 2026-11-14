"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { PAYMENT_METHOD_LABELS } from "@/config/catalog";
import { useEditOrderMutation, type AdminOrder } from "@/features/admin/api/ordersApi";
import EditDialog from "@/features/admin/products/EditDialog";
import VariantPicker from "@/features/admin/sales/VariantPicker";
import type { VariantHit } from "@/features/admin/sales/ticket";
import { errorMessage } from "@/lib/errors";
import { formatPrice } from "@/lib/format";
import type { PaymentMethod } from "@/types/api";
import { buildEditBody, currentMethod, draftFromItems, draftProblem, draftTotal, type DraftLine } from "./editDraft";

const METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

// Modifier une commande après coup (15/11, lot 2) : quantités, prix accordés, articles ajoutés ou
// retirés, moyen de paiement, coordonnées. Le serveur ajuste le stock et corrige l'argent à la
// date du jour (une caisse fermée n'est jamais réécrite) et garde une trace.
export default function EditOrderDialog({ order, open, onClose }: { order: AdminOrder; open: boolean; onClose: () => void }) {
  return (
    <EditDialog open={open} title={`Modifier la commande suivi ${order.number}`} closeLabel="Annuler" onClose={onClose}>
      {/* Monté seulement fenêtre ouverte : chaque ouverture repart de la commande telle qu'elle est. */}
      <EditForm order={order} onDone={onClose} />
    </EditDialog>
  );
}

function EditForm({ order, onDone }: { order: AdminOrder; onDone: () => void }) {
  const [editOrder, { isLoading, error }] = useEditOrderMutation();
  const gifts = order.items.filter((item) => item.isGift);
  // « Payée » = un paiement a été encaissé un jour, même si une correction a ramené le net à 0 DA.
  const paid = order.payments.some((payment) => payment.kind !== "correction");
  const [lines, setLines] = useState<DraftLine[]>(() => draftFromItems(order.items));
  const [method, setMethod] = useState<PaymentMethod>(() => currentMethod(order.payments));
  const [fullName, setFullName] = useState(order.fullName);
  const [phone, setPhone] = useState(order.phone);
  const [note, setNote] = useState(order.note ?? "");
  const problem = draftProblem(lines);
  const total = draftTotal(lines, order.shippingFee);
  const difference = total - order.total;

  const patch = (key: string, changes: Partial<DraftLine>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...changes } : line)));
  // Un nombre vide reste vide (NaN) : le brouillon le refuse au lieu de l'envoyer comme 0.
  const toNumber = (text: string) => (text.trim() === "" ? Number.NaN : Number(text));

  // Un article choisi dans le sélecteur (lot 3) : son prix de départ est son prix catalogue. Un article
  // déjà dans la commande (même retiré du brouillon) n'est pas proposé : sa ligne garde son prix
  // d'achat copié à la vente, on change sa quantité ou son prix.
  const takenSkus = [...order.items.map((item) => item.sku), ...lines.flatMap((line) => (line.sku ? [line.sku] : []))];
  function addArticle(hit: VariantHit) {
    setLines((current) => [
      ...current,
      { key: `new-${hit.sku}`, sku: hit.sku, name: hit.productName, quantity: 1, unitPrice: hit.price },
    ]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (problem) return;
    try {
      await editOrder({ id: order.id, ...buildEditBody({ lines, paid, method, fullName, phone, note }) }).unwrap();
      onDone();
    } catch {
      // L'erreur RTK Query est affichée sous le formulaire, la fenêtre reste ouverte.
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <fieldset className="space-y-3">
        <legend className="mb-1 text-lg">Articles</legend>
        {lines.map((line) => (
          <div key={line.key} className="card grid gap-3 p-3 sm:grid-cols-[1fr_6rem_9rem_auto] sm:items-end">
            <p className="font-semibold">
              {line.name}
              {line.sku ? <span className="block text-xs font-normal text-ink-muted">Nouvel article ({line.sku})</span> : null}
            </p>
            <label className="block text-sm font-semibold">
              <span className="label">Quantité</span>
              <input
                className="input"
                inputMode="numeric"
                value={Number.isNaN(line.quantity) ? "" : line.quantity}
                onChange={(event) => patch(line.key, { quantity: toNumber(event.target.value.replace(/\D/g, "")) })}
              />
            </label>
            <label className="block text-sm font-semibold">
              <span className="label">Prix accordé (DA)</span>
              <input
                className="input"
                inputMode="numeric"
                value={Number.isNaN(line.unitPrice) ? "" : line.unitPrice}
                onChange={(event) => patch(line.key, { unitPrice: toNumber(event.target.value.replace(/\D/g, "")) })}
              />
            </label>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => setLines((current) => current.filter((candidate) => candidate.key !== line.key))}
            >
              Retirer
            </button>
          </div>
        ))}
        {gifts.length > 0 ? (
          <p className="rounded-md bg-surface-2 p-3 text-sm">
            Cette commande contient des cadeaux ({gifts.map((gift) => gift.name).join(", ")}). Ils restent tels quels, donc ses
            articles et leurs quantités ne changent pas : seuls le prix, le moyen de paiement et les coordonnées se modifient.
            Pour changer les articles, supprimez la commande et refaites-la.
          </p>
        ) : (
          <VariantPicker label="Ajouter un article" onPick={addArticle} disabledSkus={takenSkus} />
        )}
      </fieldset>

      {paid ? (
        <label className="block max-w-xs text-sm font-semibold">
          <span className="label">Moyen de paiement</span>
          <select className="input" value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
            {METHODS.map((value) => (
              <option key={value} value={value}>
                {PAYMENT_METHOD_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          <span className="label">Nom et prénom</span>
          <input className="input" value={fullName} onChange={(event) => setFullName(event.target.value)} />
        </label>
        <label className="block text-sm font-semibold">
          <span className="label">Téléphone</span>
          <input className="input" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </label>
      </div>
      <label className="block text-sm font-semibold">
        <span className="label">Remarque</span>
        <textarea className="input min-h-20" rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
      </label>

      <div className="card space-y-1 p-4 text-sm" aria-live="polite">
        <p>
          Nouveau total :{" "}
          <strong className="font-display text-lg tabular-nums">{Number.isNaN(total) ? "—" : formatPrice(total)}</strong>
          {order.shippingFee > 0 ? <span className="text-ink-muted"> (livraison {formatPrice(order.shippingFee)} comprise)</span> : null}
        </p>
        {!Number.isNaN(difference) && difference !== 0 ? (
          <p className="text-ink-muted">
            {difference > 0 ? "+" : ""}
            {formatPrice(difference)} par rapport à la commande actuelle.
            {paid
              ? " L'argent déjà encaissé est corrigé dans la caisse d'aujourd'hui : la journée de caisse doit être ouverte."
              : ""}
          </p>
        ) : null}
        <p className="text-ink-muted">Le stock suit. Une trace de la modification est gardée.</p>
      </div>

      {problem ? (
        <p role="alert" className="field-error">
          {problem}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
          {errorMessage(error).includes("journée de caisse") ? (
            <>
              {" "}
              <Link href="/admin/caisse" className="underline">
                Ouvrir la caisse
              </Link>
            </>
          ) : null}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button type="submit" className="btn btn-primary" disabled={isLoading || problem !== null}>
          Enregistrer la modification
        </button>
      </div>
    </form>
  );
}
