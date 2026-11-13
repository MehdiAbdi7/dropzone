"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import ProductImage from "@/components/ui/ProductImage";
import Spinner from "@/components/ui/Spinner";
import { CONDITION_LABELS } from "@/config/catalog";
import { warrantyLabel } from "@/config/warranty";
import { formatOptions, formatPrice } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useHydrated } from "@/lib/useHydrated";
import { clearCart, closeCart, MAX_PER_LINE, removeItem, setQuantity } from "./cartSlice";
import { windowLines, type WindowLine } from "./cartSnapshot";
import QuantityStepper from "./QuantityStepper";
import { useCartPreview } from "./useCartPreview";

// La fenêtre du panier (06/11), comme le ticket de Niwa Food : le panier n'a plus de page à
// lui. Montée une fois par le layout de la boutique ; l'en-tête, la barre du bas et « Voir le
// panier » l'ouvrent par le store (`openCart`). Collée en bas sur téléphone, au milieu de
// l'écran à partir de 640 px. <dialog> natif : fond, focus et touche Échap gérés.
//
// Depuis le 13/11, les lignes s'affichent tout de suite avec la description gardée dans le
// navigateur (cartSnapshot.ts). Les prix, le total et « Commander » attendent le serveur.
export default function CartWindow() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const { items, hydrated: loaded, open, fulfillment } = useAppSelector((state) => state.cart);
  const hydrated = useHydrated() && loaded;
  const dialog = useRef<HTMLDialogElement>(null);
  // Les prix viennent toujours du serveur : le panier n'envoie que SKU et quantités. Le mode de
  // réception est celui de la page de commande (« delivery » ailleurs) : un retrait n'a pas de frais.
  const { data: preview, isError, isFetching, refetch } = useCartPreview({ skip: !open || !hydrated, fulfillment });

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
  const lines = hydrated ? windowLines(items, preview) : [];
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const onCheckout = pathname.startsWith("/commande");
  // Le total n'est montré que s'il correspond au panier affiché : pendant qu'un « − + » est
  // recalculé, l'ancien total serait faux, on remet la roue.
  const total = preview && !isFetching ? preview.total : null;

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
          {!empty && hydrated ? (
            <>
              {preview?.notices.map((notice) => (
                <p key={notice} role="status" className="rounded-lg border border-amber bg-amber-soft p-3 text-sm">
                  {notice}
                </p>
              ))}
              <ul className="divide-y divide-line">
                {preview?.unavailable.map((sku) => {
                  const name = items.find((item) => item.sku === sku)?.snapshot?.name;
                  return (
                    <li key={sku} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                      <span>
                        <span className="font-semibold">{name ?? "Article"} : retiré de la boutique</span>{" "}
                        <span className="text-ink-muted">(référence {sku})</span>
                      </span>
                      <button type="button" className="text-red underline" onClick={() => dispatch(removeItem(sku))}>
                        Retirer
                      </button>
                    </li>
                  );
                })}
                {lines.map((line) => (
                  <WindowLineItem key={line.sku} line={line} />
                ))}
              </ul>
            </>
          ) : null}
        </div>

        {!empty && hydrated ? (
          <footer
            className="shrink-0 space-y-3 border-t border-line bg-surface-2 px-5 pt-4"
            style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-display text-2xl font-bold tabular-nums">
                {total !== null ? formatPrice(total) : <Spinner label="Calcul du total…" className="size-6" />}
              </span>
            </div>
            {/* Render endormi : la première réponse peut prendre jusqu'à une minute. */}
            {!preview && !isError ? (
              <p className="text-xs text-ink-muted">Les prix sont vérifiés auprès du magasin, un instant…</p>
            ) : null}
            {preview && !preview.canOrder ? (
              <p className="text-sm font-semibold text-red">Corrigez les articles signalés pour commander.</p>
            ) : null}
            {/* Sur la page de commande, la fenêtre sert à corriger le panier : on y revient.
                Pas de commande sans prix vérifiés par le serveur. */}
            <button
              type="button"
              className="btn btn-primary w-full"
              disabled={total === null || !preview?.canOrder}
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

// Une ligne : la description (gardée ou fraîche), puis le prix quand le serveur l'a donné.
// Une ligne ajoutée à l'instant, sans description encore, montre un bloc gris le temps de la
// première réponse.
function WindowLineItem({ line }: { line: WindowLine }) {
  const dispatch = useAppDispatch();
  const { snapshot, gifts } = line;
  const options = snapshot ? formatOptions(snapshot.options) : "";
  const warranty = snapshot ? warrantyLabel(snapshot.warrantyMonths) : null;
  // Avant la réponse du serveur, on ne connaît pas le stock : le « + » reste permis jusqu'à 10,
  // et le serveur ramène la quantité au stock réel à sa réponse (ligne signalée).
  const max = line.maxQuantity ?? MAX_PER_LINE;
  const name = snapshot?.name ?? "Article";
  return (
    <li className="space-y-2 py-3">
      <div className="flex items-start gap-3">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-surface-2">
          {snapshot ? <ProductImage src={snapshot.image} alt="" sizes="64px" /> : null}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          {snapshot ? (
            <>
              <p className="font-display font-bold">{snapshot.name}</p>
              <p className="text-sm text-ink-muted">
                {CONDITION_LABELS[snapshot.condition]}
                {options ? `, ${options}` : ""}
              </p>
              {snapshot.conditionReport ? <p className="text-sm">{snapshot.conditionReport}</p> : null}
              {warranty ? <p className="text-xs font-semibold">{warranty}</p> : null}
            </>
          ) : (
            <p aria-hidden="true" className="h-5 w-40 animate-pulse rounded bg-surface-2" />
          )}
          {line.problem ? (
            <p role="alert" className="text-sm font-semibold text-red">
              {line.problem}
            </p>
          ) : null}
        </div>
        <p className="font-display font-bold whitespace-nowrap tabular-nums">
          {line.lineTotal !== null ? formatPrice(line.lineTotal) : <Spinner label={`Prix de ${name} en cours de calcul`} className="size-5" />}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 pl-19">
        {/* Une affaire peut avoir plusieurs exemplaires identiques (arrivage, 10/11) : même « − + » qu'un neuf. */}
        <QuantityStepper
          value={line.quantity}
          max={max}
          label={`Quantité de ${name}`}
          onChange={(next) => dispatch(setQuantity({ sku: line.sku, quantity: next, max }))}
        />
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
