"use client";

import Link from "next/link";
import { CONDITION_LABELS } from "@/config/catalog";
import { warrantyLabel } from "@/config/warranty";
import { useCartPreviewQuery } from "@/features/orders/ordersApi";
import { formatOptions, formatPrice } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useHydrated } from "@/lib/useHydrated";
import type { CartLine } from "@/types/api";
import { removeItem, setQuantity } from "./cartSlice";
import CartSummary from "./CartSummary";

export default function CartView() {
  const dispatch = useAppDispatch();
  const { items, hydrated: loaded } = useAppSelector((state) => state.cart);
  const hydrated = useHydrated() && loaded;
  // Les prix viennent toujours du serveur : le panier n'envoie que SKU et quantités.
  const { data: preview, isFetching, isError, refetch } = useCartPreviewQuery(items, {
    skip: !hydrated || items.length === 0,
  });

  if (!hydrated) {
    return <p className="text-ink-muted">Chargement du panier…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="card space-y-4 p-8 text-center">
        <p className="text-lg font-semibold">Votre panier est vide.</p>
        <Link href="/produits" className="btn btn-primary">
          Voir les produits
        </Link>
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="card space-y-3 p-6">
        <p>Le panier n&apos;a pas pu être calculé.</p>
        <button type="button" className="btn btn-secondary" onClick={() => refetch()}>
          Réessayer
        </button>
      </div>
    );
  }

  if (!preview) {
    return <p className="text-ink-muted">Calcul des prix…</p>;
  }

  const mainLines = preview.lines.filter((line) => !line.isGift);
  const giftsOf = (sku: string) => preview.lines.filter((line) => line.giftFor === sku);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" aria-busy={isFetching}>
      <div className="space-y-4">
        {preview.notices.length > 0 ? (
          <ul role="status" className="space-y-2 rounded-lg border border-amber bg-amber-soft p-4 text-sm">
            {preview.notices.map((notice) => (
              <li key={notice}>{notice}</li>
            ))}
          </ul>
        ) : null}

        <ul className="space-y-3">
          {preview.unavailable.map((sku) => (
            <li key={sku} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <p>
                <span className="font-semibold">Article retiré de la boutique</span>{" "}
                <span className="text-sm text-ink-muted">(référence {sku})</span>
              </p>
              <button type="button" className="btn btn-danger btn-small" onClick={() => dispatch(removeItem(sku))}>
                Retirer
              </button>
            </li>
          ))}
          {mainLines.map((line) => (
            <li key={line.sku}>
              <CartRow line={line} gifts={giftsOf(line.sku)} />
            </li>
          ))}
        </ul>
      </div>

      <CartSummary preview={preview}>
        {preview.canOrder ? (
          <Link href="/commande" className="btn btn-primary w-full">
            Passer la commande
          </Link>
        ) : (
          <p className="text-sm font-semibold text-red">Corrigez les articles signalés pour commander.</p>
        )}
      </CartSummary>
    </div>
  );
}

function CartRow({ line, gifts }: { line: CartLine; gifts: CartLine[] }) {
  const dispatch = useAppDispatch();
  const options = formatOptions(line.options);

  return (
    <article className={`card space-y-3 p-4 ${line.condition === "refurbished" ? "neon-edge pl-5" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link href={`/produits/${line.slug}`} className="font-display text-lg font-bold hover:text-blue-ink">
            {line.name}
          </Link>
          <p className="text-sm text-ink-muted">
            {CONDITION_LABELS[line.condition]}
            {options ? `, ${options}` : ""}
          </p>
          {line.conditionReport ? <p className="text-sm">{line.conditionReport}</p> : null}
          {warrantyLabel(line.warrantyMonths) ? (
            <p className="text-sm font-semibold">{warrantyLabel(line.warrantyMonths)}</p>
          ) : null}
        </div>
        <p className="font-display text-lg font-bold">{formatPrice(line.lineTotal)}</p>
      </div>

      {line.problem ? (
        <p role="alert" className="text-sm font-semibold text-red">
          {line.problem}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {line.condition === "refurbished" ? (
          <p className="text-sm text-ink-muted">Appareil unique, quantité 1</p>
        ) : (
          <label className="flex items-center gap-2 text-sm">
            <span>Quantité</span>
            <select
              className="input min-h-9 w-20 py-1"
              value={line.quantity}
              onChange={(event) => dispatch(setQuantity({ sku: line.sku, quantity: Number(event.target.value) }))}
            >
              {Array.from({ length: Math.max(line.maxQuantity, line.quantity) }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="button" className="text-sm text-red underline" onClick={() => dispatch(removeItem(line.sku))}>
          Retirer
        </button>
      </div>

      {gifts.length > 0 ? (
        <ul className="space-y-1 border-t border-line pt-3 text-sm">
          {gifts.map((gift) => (
            <li key={gift.sku} className="flex flex-wrap justify-between gap-2">
              <span>
                {gift.quantity > 1 ? `${gift.quantity} × ` : ""}
                {gift.name}
              </span>
              <span>
                <s className="text-ink-muted">{formatPrice(gift.normalPrice * gift.quantity)}</s>{" "}
                <strong className="text-red">Offert</strong>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
