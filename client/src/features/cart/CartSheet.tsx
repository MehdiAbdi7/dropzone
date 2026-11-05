"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import ProductImage from "@/components/ui/ProductImage";
import { CONDITION_LABELS } from "@/config/catalog";
import { formatOptions, formatPrice } from "@/lib/format";
import { useAppDispatch } from "@/lib/hooks";
import type { CartLine, CartPreview } from "@/types/api";
import { removeItem, setQuantity } from "./cartSlice";
import QuantityStepper from "./QuantityStepper";

// Le panneau de la barre du panier (05/11), comme le ticket de Niwa Food : il monte du bas
// avec les lignes, la quantité de chacune (limitée au stock réel), le total, « Commander » et
// « Voir le panier ». <dialog> natif : le fond, le focus et la touche Échap sont gérés.
export default function CartSheet({ open, preview, onClose }: { open: boolean; preview: CartPreview; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  const bought = preview.lines.filter((line) => !line.isGift);
  const giftsOf = (sku: string) => preview.lines.filter((line) => line.giftFor === sku);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      // Un clic sur le fond (le <dialog> lui-même, hors du contenu) ferme le panneau.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-label="Mon panier"
      className="mx-auto mt-auto mb-0 max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/60"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-surface px-5 py-3">
        <h2 className="text-lg">Mon panier</h2>
        <button type="button" className="btn btn-secondary btn-small" onClick={onClose}>
          Fermer
        </button>
      </div>

      <div className="space-y-3 p-5">
        {preview.notices.map((notice) => (
          <p key={notice} role="status" className="rounded-lg border border-amber bg-amber-soft p-3 text-sm">
            {notice}
          </p>
        ))}
        {preview.unavailable.length > 0 ? (
          <p role="status" className="rounded-lg border border-amber bg-amber-soft p-3 text-sm">
            {preview.unavailable.length} article{preview.unavailable.length > 1 ? "s ne sont" : " n'est"} plus en vente : retirez-
            {preview.unavailable.length > 1 ? "les" : "le"} depuis la page Panier.
          </p>
        ) : null}

        <ul className="divide-y divide-line">
          {bought.map((line) => (
            <SheetLine key={line.sku} line={line} gifts={giftsOf(line.sku)} />
          ))}
        </ul>

        <div className="flex items-center justify-between border-t border-line pt-3">
          <span className="font-semibold">Total</span>
          <span className="font-display text-xl font-bold">{formatPrice(preview.total)}</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Link href="/commande" className="btn btn-primary" onClick={onClose}>
            Commander
          </Link>
          <Link href="/panier" className="btn btn-secondary" onClick={onClose}>
            Voir le panier
          </Link>
        </div>
      </div>
    </dialog>
  );
}

function SheetLine({ line, gifts }: { line: CartLine; gifts: CartLine[] }) {
  const dispatch = useAppDispatch();
  const options = formatOptions(line.options);
  return (
    <li className="space-y-2 py-3">
      <div className="flex items-start gap-3">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface-2">
          <ProductImage src={line.image} alt="" sizes="64px" />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="font-display font-bold">{line.name}</p>
          <p className="text-sm text-ink-muted">
            {CONDITION_LABELS[line.condition]}
            {options ? `, ${options}` : ""}
          </p>
          {line.problem ? (
            <p role="alert" className="text-sm font-semibold text-red">
              {line.problem}
            </p>
          ) : null}
        </div>
        <p className="font-display font-bold whitespace-nowrap">{formatPrice(line.lineTotal)}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 pl-19">
        {line.condition === "refurbished" ? (
          <span className="text-sm text-ink-muted">Appareil unique</span>
        ) : (
          <QuantityStepper
            value={line.quantity}
            max={line.maxQuantity}
            label={`Quantité de ${line.name}`}
            onChange={(quantity) => dispatch(setQuantity({ sku: line.sku, quantity, max: line.maxQuantity }))}
          />
        )}
        <button type="button" className="text-sm text-red underline" onClick={() => dispatch(removeItem(line.sku))}>
          Retirer
        </button>
      </div>
      {gifts.map((gift) => (
        <p key={gift.sku} className="pl-19 text-sm text-ink-muted">
          Offert : {gift.name}
          {gift.quantity > 1 ? ` × ${gift.quantity}` : ""}
        </p>
      ))}
    </li>
  );
}
