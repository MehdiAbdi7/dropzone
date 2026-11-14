"use client";

import Link from "next/link";
import { useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { CONDITION_LABELS, PAYMENT_METHOD_LABELS } from "@/config/catalog";
import { useCreateSaleMutation, type SaleDone } from "@/features/admin/api/salesApi";
import QuantityStepper from "@/features/cart/QuantityStepper";
import { useCartPreviewQuery } from "@/features/orders/ordersApi";
import { errorMessage } from "@/lib/errors";
import { formatOptions, formatPrice } from "@/lib/format";
import type { CartLine, PaymentMethod } from "@/types/api";
import {
  buildSaleBody,
  reductionText,
  syncCatalogPrices,
  ticketProblem,
  ticketTotal,
  type SaleForm,
  type TicketLine,
} from "./ticket";

const METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];
// Un nombre vide reste vide (NaN) : le ticket le refuse au lieu de l'envoyer comme 0.
const toNumber = (text: string) => (text.trim() === "" ? Number.NaN : Number(text));

// Le ticket de la vente au magasin (16/11, lot 3) : les lignes (quantité, prix accordé modifiable
// avec la réduction), les cadeaux ajoutés par le serveur, le client, le moyen de paiement.
// « Encaisser » crée la vente et la met dans la caisse du jour.
export default function SaleTicket({
  lines,
  setLines,
  onDone,
}: {
  lines: TicketLine[];
  setLines: Dispatch<SetStateAction<TicketLine[]>>;
  onDone: (sale: SaleDone) => void;
}) {
  const [createSale, { isLoading, error }] = useCreateSaleMutation();
  const [form, setForm] = useState<SaleForm>({ fullName: "", phone: "" });
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [note, setNote] = useState("");

  // Le récapitulatif du serveur : cadeaux d'une affaire, limitations, problèmes de stock. Le même
  // calcul que la commande du site (retrait : pas de frais de livraison).
  const items = useMemo(() => lines.map(({ sku, quantity }) => ({ sku, quantity })), [lines]);
  const { data: preview } = useCartPreviewQuery({ items, fulfillment: "pickup" }, { skip: lines.length === 0 });
  const gifts: CartLine[] = preview?.lines.filter((line) => line.isGift) ?? [];
  const limitations = preview?.limitations ?? [];
  const problems = preview?.lines.filter((line) => line.problem) ?? [];
  // « Un cadeau n'est plus offert, il est épuisé » : le vendeur doit le voir avant d'encaisser.
  const notices = preview?.notices ?? [];

  // Les lignes affichées : le prix catalogue du ticket est aligné sur celui d'AUJOURD'HUI donné par le
  // récapitulatif (il a pu changer depuis la recherche). Calculé à l'affichage, sans effet.
  const synced = useMemo(
    () => syncCatalogPrices(lines, preview?.lines.filter((line) => !line.isGift) ?? []),
    [lines, preview],
  );
  const shown = synced.lines;

  // La case des limitations est liée aux appareils qui les ont : changer d'appareil la décoche.
  const limitationsKey = limitations.map((item) => item.sku).join(",");
  const [acceptedFor, setAcceptedFor] = useState<string | null>(null);
  const accepted = limitations.length > 0 && acceptedFor === limitationsKey;

  const total = ticketTotal(shown);
  const problem =
    ticketProblem(shown, form) ??
    (limitations.length > 0 && !accepted ? "Le client doit accepter les limitations des appareils reconditionnés." : null);

  const patch = (key: string, changes: Partial<TicketLine>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...changes } : line)));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (problem) return;
    try {
      const sale = await createSale(buildSaleBody({ lines: shown, form, method, note, acceptLimitations: accepted })).unwrap();
      onDone(sale);
    } catch {
      // L'erreur RTK Query est affichée sous le bouton ; le ticket reste tel quel.
    }
  }

  return (
    <form
      onSubmit={submit}
      className="card space-y-5 p-4 sm:p-5"
      aria-label="Ticket de vente"
      // Entrée dans un champ (prix, remarque, ou une douchette) ne doit pas encaisser par mégarde :
      // on encaisse avec le bouton.
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement && event.target.type !== "checkbox") {
          event.preventDefault();
        }
      }}
    >
      <h2 className="text-xl">Ticket</h2>

      {synced.changed.length > 0 ? (
        <p role="status" className="rounded-md bg-surface-2 p-3 text-sm font-semibold">
          Le prix catalogue a changé depuis la recherche : {synced.changed.map((name) => `« ${name} »`).join(", ")}. Le ticket est
          à jour.
        </p>
      ) : null}

      {shown.length === 0 ? (
        <p className="text-ink-muted">Cherchez un appareil et choisissez-le pour l&apos;ajouter au ticket.</p>
      ) : (
        <ul className="space-y-3">
          {shown.map((line) => {
            const reduction = reductionText(line);
            return (
              <li key={line.key} className="space-y-3 rounded-lg border border-line bg-surface-2 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-semibold">
                    {line.name}
                    <span className="block text-sm font-normal text-ink-muted">
                      {CONDITION_LABELS[line.condition]}
                      {Object.keys(line.options).length ? ` · ${formatOptions(line.options)}` : ""} · {line.sku}
                    </span>
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary btn-small shrink-0"
                    onClick={() => setLines((current) => current.filter((candidate) => candidate.key !== line.key))}
                  >
                    Retirer
                  </button>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <QuantityStepper
                    value={line.quantity}
                    max={line.maxQuantity}
                    label={`Quantité de ${line.name}`}
                    onChange={(quantity) => patch(line.key, { quantity })}
                  />
                  <label className="block text-sm font-semibold">
                    <span className="label">Prix accordé (DA)</span>
                    <input
                      className="input w-40"
                      inputMode="numeric"
                      aria-label={`Prix accordé de ${line.name}`}
                      value={Number.isNaN(line.unitPrice) ? "" : line.unitPrice}
                      onChange={(event) => patch(line.key, { unitPrice: toNumber(event.target.value.replace(/\D/g, "")) })}
                    />
                  </label>
                  <p className="pb-2 text-sm text-ink-muted">Catalogue : {formatPrice(line.listPrice)}</p>
                </div>
                {reduction ? (
                  <p className="text-sm font-semibold" aria-live="polite">
                    Réduction : {reduction}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {gifts.length > 0 ? (
        <p className="rounded-md bg-surface-2 p-3 text-sm">
          Offert avec cette affaire : {gifts.map((gift) => `${gift.quantity} × ${gift.name}`).join(", ")}. Le stock du cadeau
          baisse aussi.
        </p>
      ) : null}
      {notices.length > 0 ? (
        <ul role="alert" className="list-disc space-y-1 pl-5 text-sm font-semibold text-red">
          {notices.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
      ) : null}
      {problems.length > 0 ? (
        <p role="alert" className="field-error">
          {problems.map((line) => `« ${line.name} » : ${line.problem}`).join(" ; ")}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          <span className="label">Nom et prénom du client</span>
          <input
            className="input"
            autoComplete="off"
            value={form.fullName}
            onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
          />
        </label>
        <label className="block text-sm font-semibold">
          <span className="label">Téléphone du client</span>
          <input
            className="input"
            inputMode="tel"
            autoComplete="off"
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          <span className="label">Moyen de paiement</span>
          <select className="input" value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
            {METHODS.map((value) => (
              <option key={value} value={value}>
                {PAYMENT_METHOD_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          <span className="label">Remarque (facultatif)</span>
          <input className="input" value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
      </div>

      {limitations.length > 0 ? (
        <div className="space-y-2 rounded-md border border-line p-3 text-sm">
          <p className="font-semibold">Limitations des appareils reconditionnés du ticket :</p>
          <ul className="list-disc space-y-1 pl-5">
            {limitations.map((item) => (
              <li key={item.sku}>
                {item.name} : {item.limitations.join(", ")}
              </li>
            ))}
          </ul>
          <label className="flex items-start gap-2 font-semibold">
            <input
              type="checkbox"
              className="mt-1 size-5"
              checked={accepted}
              onChange={(event) => setAcceptedFor(event.target.checked ? limitationsKey : null)}
            />
            <span>Le client a pris connaissance de ces limitations et les accepte.</span>
          </label>
        </div>
      ) : null}

      {problem && lines.length > 0 ? (
        <p id="sale-problem" className="text-sm text-ink-muted">
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

      <button type="submit" className="btn btn-primary w-full" disabled={isLoading || problem !== null} aria-describedby="sale-problem">
        {isLoading ? "Encaissement…" : `Encaisser · ${Number.isNaN(total) ? "—" : formatPrice(total)}`}
      </button>
    </form>
  );
}
