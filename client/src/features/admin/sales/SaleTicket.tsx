"use client";

import Link from "next/link";
import { useMemo, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react";
import { CONDITION_LABELS, PAYMENT_METHOD_LABELS } from "@/config/catalog";
import { useCreateExchangeMutation, type ExchangeDone } from "@/features/admin/api/exchangeApi";
import { useCreatePhoneOrderMutation, type PhoneOrderDone } from "@/features/admin/api/phoneOrderApi";
import { useCreateSaleMutation, type SaleDone } from "@/features/admin/api/salesApi";
import {
  buildExchangeBody,
  differenceText,
  exchangeDifference,
  tradeInPrice,
  tradeInProblem,
  type TradeInDraft,
} from "@/features/admin/exchange/exchange";
import EditDialog from "@/features/admin/products/EditDialog";
import QuantityStepper from "@/features/cart/QuantityStepper";
import { useCartPreviewQuery } from "@/features/orders/ordersApi";
import { errorMessage } from "@/lib/errors";
import { formatOptions, formatPrice } from "@/lib/format";
import type { CartLine, PaymentMethod } from "@/types/api";
import {
  belowPurchasePrice,
  buildSaleBody,
  clientReady,
  reductionText,
  syncCatalogPrices,
  ticketProblem,
  ticketTotal,
  type SaleForm,
  type TicketLine,
  type VariantHit,
} from "./ticket";
import { buildPhoneOrderBody, phoneOrderProblem, phoneOrderShipping, phoneOrderTotal, type PhoneOrderDraft } from "./phoneOrder";
import VariantDetailDialog from "./VariantDetailDialog";

const METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];
// Un nombre vide reste vide (NaN) : le ticket le refuse au lieu de l'envoyer comme 0.
const toNumber = (text: string) => (text.trim() === "" ? Number.NaN : Number(text));

// Le ticket de la vente au magasin (16/11, lot 3) : les lignes (quantité, prix accordé modifiable
// avec la réduction), les cadeaux ajoutés par le serveur, le client, le moyen de paiement.
// « Encaisser » crée la vente et la met dans la caisse du jour.
// Avec `exchange` (lot 5), le même ticket est celui de ce que le MAGASIN DONNE dans un échange : le
// formulaire de la reprise du client s'insère sous les lignes, et le bouton valide l'échange (la
// différence va dans la caisse du jour, positive si le client paie, négative si le magasin rend).
// Avec `phoneOrder` (19/11), c'est le ticket d'une commande reçue par téléphone : une livraison ou une réservation,
// sans moyen de paiement ni caisse. Le bouton « Livraison » ou « Réservation » ouvre la fenêtre de l'adresse ou du
// jour, et le bouton crée la commande « À confirmer » (ou « Réservée »).
// `picker` : la fenêtre de recherche de produit (ShopPicker), ouverte par « Ajouter un produit » (vente)
// ou « Téléphone proposé » (échange).
type Props = { lines: TicketLine[]; setLines: Dispatch<SetStateAction<TicketLine[]>>; picker: ReactNode } & (
  | { exchange?: undefined; phoneOrder?: undefined; onDone: (sale: SaleDone) => void }
  | { exchange: { tradeIn: TradeInDraft; form: ReactNode }; phoneOrder?: undefined; onDone: (done: ExchangeDone) => void }
  // `form` reçoit les frais de livraison que le serveur calcule pour ce panier (null tant qu'on ne les connaît pas).
  | { exchange?: undefined; phoneOrder: { draft: PhoneOrderDraft; form: (estimatedFee: number | null) => ReactNode }; onDone: (done: PhoneOrderDone) => void }
);

export default function SaleTicket(props: Props) {
  const { lines, setLines } = props;
  const [createSale, saleState] = useCreateSaleMutation();
  const [createExchange, exchangeState] = useCreateExchangeMutation();
  const [createPhoneOrder, phoneState] = useCreatePhoneOrderMutation();
  const { isLoading, error } = props.exchange ? exchangeState : props.phoneOrder ? phoneState : saleState;
  const [form, setForm] = useState<SaleForm>({ fullName: "", phone: "" });
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [note, setNote] = useState("");
  // Les trois formulaires vivent dans des fenêtres (refonte du 18/11) : la page reste courte, le
  // vendeur ouvre seulement ce dont il a besoin. Les valeurs restent ici, la fermeture ne les perd pas.
  const [open, setOpen] = useState<"client" | "tradeIn" | "picker" | "phone" | null>(null);
  const close = () => setOpen(null);
  // L'appareil dont on regarde la fiche (bouton « Détail » d'une ligne).
  const [detail, setDetail] = useState<VariantHit | null>(null);

  // Le récapitulatif du serveur : cadeaux d'une affaire, limitations, problèmes de stock. Le même
  // calcul que la commande du site (retrait : pas de frais de livraison ; une commande par téléphone suit son mode).
  const items = useMemo(() => lines.map(({ sku, quantity }) => ({ sku, quantity })), [lines]);
  const { data: preview } = useCartPreviewQuery(
    { items, fulfillment: props.phoneOrder?.draft.fulfillment ?? "pickup" },
    { skip: lines.length === 0 },
  );
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
    (props.exchange ? tradeInProblem(props.exchange.tradeIn) : null) ??
    (props.phoneOrder ? phoneOrderProblem(props.phoneOrder.draft) : null) ??
    (limitations.length > 0 && !accepted ? "Le client doit accepter les limitations des appareils reconditionnés." : null);
  // Ce que le client paie en plus (positif) ou ce que le magasin lui rend (négatif) ; NaN tant qu'un des
  // deux prix manque.
  const difference = props.exchange ? exchangeDifference(total, tradeInPrice(props.exchange.tradeIn)) : Number.NaN;

  const patch = (key: string, changes: Partial<TicketLine>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...changes } : line)));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (problem) return;
    try {
      const ticket = { lines: shown, form, method, note, acceptLimitations: accepted };
      if (props.exchange) {
        props.onDone(await createExchange(buildExchangeBody({ ...ticket, tradeIn: props.exchange.tradeIn })).unwrap());
      } else if (props.phoneOrder) {
        props.onDone(await createPhoneOrder(buildPhoneOrderBody(ticket, props.phoneOrder.draft)).unwrap());
      } else {
        props.onDone(await createSale(buildSaleBody(ticket)).unwrap());
      }
    } catch {
      // L'erreur RTK Query est affichée sous le bouton ; le ticket reste tel quel.
    }
  }

  return (
    <form
      onSubmit={submit}
      id="ticket"
      className="card scroll-mt-20 space-y-4 p-4 sm:p-5"
      aria-label={props.exchange ? "Ticket de l'échange" : props.phoneOrder ? "Ticket de la commande par téléphone" : "Ticket de vente"}
      // Entrée dans un champ (prix, remarque, ou une douchette) ne doit pas encaisser par mégarde :
      // on encaisse avec le bouton.
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement && event.target.type !== "checkbox") {
          event.preventDefault();
        }
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl">{props.exchange ? "Échange" : "Ticket"}</h2>
        <div className="flex flex-wrap gap-2">
          <WindowButton onClick={() => setOpen("picker")} done={lines.length > 0}>
            {props.exchange ? "Téléphone proposé" : "Ajouter un produit"}
            {lines.length > 0 ? ` (${lines.length})` : ""}
          </WindowButton>
          {props.exchange ? (
            <WindowButton onClick={() => setOpen("tradeIn")} done={tradeInProblem(props.exchange.tradeIn) === null}>
              Téléphone repris
            </WindowButton>
          ) : null}
          {props.phoneOrder ? (
            <WindowButton onClick={() => setOpen("phone")} done={phoneOrderProblem(props.phoneOrder.draft) === null}>
              {props.phoneOrder.draft.fulfillment === "delivery" ? "Livraison" : "Réservation"}
            </WindowButton>
          ) : null}
          <WindowButton onClick={() => setOpen("client")} done={clientReady(form)}>
            Formulaire client
          </WindowButton>
        </div>
      </div>

      {synced.changed.length > 0 ? (
        <p role="status" className="rounded-md bg-surface-2 p-3 text-sm font-semibold">
          Le prix catalogue a changé depuis la recherche : {synced.changed.map((name) => `« ${name} »`).join(", ")}. Le ticket est
          à jour.
        </p>
      ) : null}

      {shown.length === 0 ? (
        <p className="text-ink-muted">
          {props.exchange
            ? "Ouvrez « Téléphone proposé » pour choisir ce que le magasin donne."
            : "Appuyez sur « Ajouter un produit » pour choisir un appareil."}
        </p>
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
                  <div className="flex shrink-0 gap-2">
                    <button type="button" className="btn btn-secondary btn-small" onClick={() => setDetail(line.hit)}>
                      Détail
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-small"
                      onClick={() => setLines((current) => current.filter((candidate) => candidate.key !== line.key))}
                    >
                      Retirer
                    </button>
                  </div>
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
                  {/* La limite de la négociation : ce que l'appareil a coûté au magasin. */}
                  <p className="pb-2 text-sm text-ink-muted">
                    {line.hit.purchasePrice == null ? "Prix d'achat non renseigné" : `Prix d'achat : ${formatPrice(line.hit.purchasePrice)}`}
                  </p>
                </div>
                {belowPurchasePrice(line.unitPrice, line.hit.purchasePrice) ? (
                  <p role="status" className="text-sm font-semibold text-red">
                    Sous le prix d&apos;achat
                  </p>
                ) : null}
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

      {/* La fiche de l'appareil d'une ligne du ticket (bouton « Détail »). */}
      <VariantDetailDialog hit={detail} onClose={() => setDetail(null)} />

      {/* La recherche de produit : le parcours de la boutique, dans une fenêtre. */}
      <EditDialog open={open === "picker"} title={props.exchange ? "Téléphone proposé par le magasin" : "Ajouter un produit"} onClose={close}>
        {props.picker}
      </EditDialog>

      {/* Ce que le client donne (échange) : son téléphone, au prix de reprise saisi à la main. */}
      {props.exchange ? (
        <EditDialog open={open === "tradeIn"} title="Téléphone repris au client" onClose={close}>
          {props.exchange.form}
        </EditDialog>
      ) : null}

      {/* L'adresse de livraison, ou le jour et l'heure de la réservation (commande par téléphone). */}
      {props.phoneOrder ? (
        <EditDialog
          open={open === "phone"}
          title={props.phoneOrder.draft.fulfillment === "delivery" ? "Livraison" : "Réservation au magasin"}
          size="sm"
          onClose={close}
        >
          {/* L'estimation des frais suit la base du serveur : le sous-total après les prix accordés. */}
          {props.phoneOrder.form(
            Number.isNaN(total) ? null : phoneOrderShipping(total, { ...props.phoneOrder.draft, shippingFee: Number.NaN }),
          )}
        </EditDialog>
      ) : null}

      <EditDialog open={open === "client"} title="Formulaire client" size="sm" onClose={close}>
      <div className="space-y-4">
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
        {/* Une commande par téléphone n'encaisse rien : pas de moyen de paiement. */}
        {props.phoneOrder ? null : (
          <label className="block text-sm font-semibold">
            <span className="label">{props.exchange ? "Moyen de paiement de la différence" : "Moyen de paiement"}</span>
            <select className="input" value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
              {METHODS.map((value) => (
                <option key={value} value={value}>
                  {PAYMENT_METHOD_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block text-sm font-semibold">
          <span className="label">Remarque (facultatif)</span>
          <input className="input" value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
      </div>
      </div>
      </EditDialog>

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
            <span>
              {props.phoneOrder
                ? "Le client a été informé de ces limitations par téléphone et les accepte."
                : "Le client a pris connaissance de ces limitations et les accepte."}
            </span>
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

      {/* Le total que le vendeur lit au client : les articles et la livraison, sur la même base que le serveur. */}
      {props.phoneOrder?.draft.fulfillment === "delivery" && !Number.isNaN(total) && lines.length > 0 ? (
        <p className="rounded-md bg-surface-2 p-3 text-sm" aria-live="polite">
          Articles {formatPrice(total)} · livraison {formatPrice(phoneOrderShipping(total, props.phoneOrder.draft))} ·{" "}
          <strong>total {formatPrice(phoneOrderTotal(total, props.phoneOrder.draft))}</strong>
        </p>
      ) : null}

      {/* Le bilan de l'échange : ce que le magasin donne, ce qu'il reprend, et qui paie la différence. */}
      {props.exchange && !Number.isNaN(difference) ? (
        <div className="space-y-1 rounded-lg border border-line bg-surface-2 p-4" aria-live="polite">
          <p className="text-sm text-ink-muted">
            Le magasin donne {formatPrice(total)} · il reprend le téléphone du client à {formatPrice(tradeInPrice(props.exchange.tradeIn))}
          </p>
          <p className="font-display text-lg font-bold">{differenceText(difference)}</p>
        </div>
      ) : null}

      <button type="submit" className="btn btn-primary w-full" disabled={isLoading || problem !== null} aria-describedby="sale-problem">
        {props.exchange
          ? isLoading
            ? "Enregistrement…"
            : "Valider l'échange"
          : props.phoneOrder
            ? isLoading
              ? "Enregistrement…"
              : `Créer la commande · ${Number.isNaN(total) ? "—" : formatPrice(phoneOrderTotal(total, props.phoneOrder.draft))}`
            : isLoading
              ? "Encaissement…"
              : `Encaisser · ${Number.isNaN(total) ? "—" : formatPrice(total)}`}
      </button>
    </form>
  );
}

// Un bouton qui ouvre une fenêtre, avec une pastille : verte et cochée quand la partie est remplie,
// rouge sinon (le vendeur voit ce qui manque sans ouvrir).
function WindowButton({ onClick, done, children }: { onClick: () => void; done: boolean; children: ReactNode }) {
  return (
    <button type="button" className="btn btn-secondary btn-small gap-2" onClick={onClick}>
      <span
        aria-hidden="true"
        className={`inline-block size-2.5 rounded-full ${done ? "bg-emerald-500" : "bg-red"}`}
      />
      {children}
      <span className="sr-only">{done ? " (rempli)" : " (à remplir)"}</span>
    </button>
  );
}
