"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import ProductImage from "@/components/ui/ProductImage";
import { CONDITION_LABELS } from "@/config/catalog";
import { warrantyLabel } from "@/config/warranty";
import { useCartPreviewQuery } from "@/features/orders/ordersApi";
import { formatOptions, formatPrice } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useHydrated } from "@/lib/useHydrated";
import type { CartLine } from "@/types/api";
import { lineQuantity } from "./cartQuantity";
import { clearCart, closeCart, removeItem, setQuantity } from "./cartSlice";
import QuantityStepper from "./QuantityStepper";

// La fenêtre du panier (06/11), comme le ticket de Niwa Food : le panier n'a plus de page à
// lui. Montée une fois par le layout de la boutique ; l'en-tête, la barre du bas et « Voir le
// panier » l'ouvrent par le store (`openCart`). Collée en bas sur téléphone, au milieu de
// l'écran à partir de 640 px. <dialog> natif : fond, focus et touche Échap gérés.
export default function CartWindow() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const { items, hydrated: loaded, open } = useAppSelector((state) => state.cart);
  const hydrated = useHydrated() && loaded;
  const dialog = useRef<HTMLDialogElement>(null);
  // Les prix viennent toujours du serveur : le panier n'envoie que SKU et quantités.
  const { data: preview, isError, refetch } = useCartPreviewQuery(items, {
    skip: !open || !hydrated || items.length === 0,
  });

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  // Changer de page (lien, bouton Retour) ferme la fenêtre.
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current !== pathname) {
      lastPath.current = pathname;
      dispatch(closeCart());
    }
  }, [pathname, dispatch]);

  const close = () => dispatch(closeCart());
  const empty = hydrated && items.length === 0;
  const bought = preview?.lines.filter((line) => !line.isGift) ?? [];
  const giftsOf = (sku: string) => preview?.lines.filter((line) => line.giftFor === sku) ?? [];
  const count = bought.reduce((sum, line) => sum + line.quantity, 0);
  const onCheckout = pathname.startsWith("/commande");

  return (
    <dialog
      ref={dialog}
      onClose={close}
      // Un clic sur le fond (le <dialog> lui-même, hors du contenu) ferme la fenêtre.
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      aria-labelledby="cart-window-title"
      className="mx-auto mt-auto mb-0 max-h-[94dvh] w-full max-w-md overflow-hidden rounded-t-3xl border border-line bg-surface p-0 text-ink backdrop:bg-black/60 backdrop:backdrop-blur-[2px] sm:my-auto sm:max-h-[90dvh] sm:rounded-3xl"
    >
      <div className="flex max-h-[inherit] flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 id="cart-window-title" className="text-lg">
              Mon panier
            </h2>
            {count > 0 ? (
              <p className="text-xs font-semibold text-ink-muted tabular-nums">
                {count} article{count > 1 ? "s" : ""}
              </p>
            ) : null}
          </div>
          <button type="button" className="icon-btn" aria-label="Fermer le panier" onClick={close}>
            <span aria-hidden="true" className="text-xl leading-none">
              ×
            </span>
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {!hydrated ? <p className="text-ink-muted">Chargement du panier…</p> : null}
          {empty ? (
            <div className="space-y-3 py-10 text-center">
              <p className="font-display text-lg font-bold">Votre panier est vide.</p>
              <p className="text-sm text-ink-muted">Choisissez un appareil dans la Boutique.</p>
              <Link href="/boutique" className="btn btn-primary" onClick={close}>
                Aller à la Boutique
              </Link>
            </div>
          ) : null}
          {isError ? (
            <div role="alert" className="space-y-3">
              <p>Le panier n&apos;a pas pu être calculé.</p>
              <button type="button" className="btn btn-secondary btn-small" onClick={() => refetch()}>
                Réessayer
              </button>
            </div>
          ) : null}
          {!empty && hydrated && !preview && !isError ? <p className="text-ink-muted">Calcul des prix…</p> : null}

          {preview && !empty ? (
            <>
              {preview.notices.map((notice) => (
                <p key={notice} role="status" className="rounded-lg border border-amber bg-amber-soft p-3 text-sm">
                  {notice}
                </p>
              ))}
              <ul className="divide-y divide-line">
                {preview.unavailable.map((sku) => (
                  <li key={sku} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <span>
                      <span className="font-semibold">Article retiré de la boutique</span>{" "}
                      <span className="text-ink-muted">(référence {sku})</span>
                    </span>
                    <button type="button" className="text-red underline" onClick={() => dispatch(removeItem(sku))}>
                      Retirer
                    </button>
                  </li>
                ))}
                {bought.map((line) => (
                  <WindowLine key={line.sku} line={line} gifts={giftsOf(line.sku)} />
                ))}
              </ul>
            </>
          ) : null}
        </div>

        {preview && !empty ? (
          <footer
            className="shrink-0 space-y-3 border-t border-line bg-surface-2 px-5 pt-4"
            style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-display text-2xl font-bold tabular-nums">{formatPrice(preview.total)}</span>
            </div>
            {!preview.canOrder ? (
              <p className="text-sm font-semibold text-red">Corrigez les articles signalés pour commander.</p>
            ) : null}
            {/* Sur la page de commande, la fenêtre sert à corriger le panier : on y revient. */}
            <button
              type="button"
              className="btn btn-primary w-full"
              disabled={!preview.canOrder}
              onClick={() => {
                close();
                if (!onCheckout) router.push("/commande");
              }}
            >
              {onCheckout ? "Continuer ma commande" : "Commander"}
            </button>
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-muted">Paiement à la livraison</span>
              <button
                type="button"
                className="font-semibold text-ink-muted underline hover:text-red"
                onClick={() => dispatch(clearCart())}
              >
                Vider le panier
              </button>
            </div>
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}

function WindowLine({ line, gifts }: { line: CartLine; gifts: CartLine[] }) {
  const dispatch = useAppDispatch();
  // La quantité du panier du navigateur, à jour au clic (l'aperçu arrive un aller-retour après).
  const quantity = lineQuantity(useAppSelector((state) => state.cart.items), line.sku, line.quantity);
  const options = formatOptions(line.options);
  const warranty = warrantyLabel(line.warrantyMonths);
  return (
    <li className="space-y-2 py-3">
      <div className="flex items-start gap-3">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-surface-2">
          <ProductImage src={line.image} alt="" sizes="64px" />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="font-display font-bold">{line.name}</p>
          <p className="text-sm text-ink-muted">
            {CONDITION_LABELS[line.condition]}
            {options ? `, ${options}` : ""}
          </p>
          {line.conditionReport ? <p className="text-sm">{line.conditionReport}</p> : null}
          {warranty ? <p className="text-xs font-semibold">{warranty}</p> : null}
          {line.problem ? (
            <p role="alert" className="text-sm font-semibold text-red">
              {line.problem}
            </p>
          ) : null}
        </div>
        <p className="font-display font-bold whitespace-nowrap tabular-nums">{formatPrice(line.lineTotal)}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 pl-19">
        {line.condition === "refurbished" ? (
          <span className="text-sm text-ink-muted">Appareil unique</span>
        ) : (
          <QuantityStepper
            value={quantity}
            max={line.maxQuantity}
            label={`Quantité de ${line.name}`}
            onChange={(next) => dispatch(setQuantity({ sku: line.sku, quantity: next, max: line.maxQuantity }))}
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
