"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCartPreviewQuery } from "@/features/orders/ordersApi";
import { formatPrice } from "@/lib/format";
import { useAppSelector } from "@/lib/hooks";
import { useHydrated } from "@/lib/useHydrated";
import { cartBarSummary, showCartBar } from "./cartQuantity";
import CartSheet from "./CartSheet";

// La barre du panier (05/11), comme celle de Niwa Food : toujours visible en bas de la
// boutique dès qu'il y a un article, avec le total ; les vignettes empilées disent d'un coup
// d'œil CE QUI est dans le panier. Un clic ouvre le panneau (CartSheet). Les prix viennent
// de l'aperçu du panier de l'API, jamais du navigateur.
export default function CartBar() {
  const pathname = usePathname();
  const { items, hydrated: loaded } = useAppSelector((state) => state.cart);
  const hydrated = useHydrated() && loaded;
  const visible = hydrated && items.length > 0 && showCartBar(pathname);
  const { data: preview } = useCartPreviewQuery(items, { skip: !visible });
  const [open, setOpen] = useState(false);

  if (!visible || !preview) {
    return null;
  }
  const { count, total, thumbs, hidden } = cartBarSummary(preview);
  if (count === 0) {
    return null;
  }
  const itemsLabel = `${count} article${count > 1 ? "s" : ""}`;

  return (
    <>
      {/* La place de la barre sous le contenu : elle ne cache jamais le bas de la page. */}
      <div aria-hidden="true" className="h-24" />
      <div className="fixed inset-x-0 z-30 px-4" style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Voir mon panier, ${itemsLabel}, ${formatPrice(total)}`}
          className="mx-auto flex h-16 w-full max-w-md items-center gap-3 rounded-full bg-blue ps-2.5 pe-4 text-on-brand shadow-[0_14px_38px_-10px_rgba(0,0,0,0.65)] transition-transform hover:scale-[1.02] active:scale-[0.99]"
        >
          <span aria-hidden="true" className="flex shrink-0 items-center">
            {thumbs.map((src, index) => (
              <span
                key={`${src}-${index}`}
                className={`flex size-11 items-center justify-center overflow-hidden rounded-full border-2 border-blue bg-white ${index > 0 ? "-ms-4" : ""}`}
                style={{ zIndex: thumbs.length - index }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="size-full object-contain" />
              </span>
            ))}
            {hidden > 0 ? (
              <span className="-ms-4 flex size-11 items-center justify-center rounded-full border-2 border-blue bg-white/25 text-xs font-bold tabular-nums">
                +{hidden}
              </span>
            ) : null}
          </span>
          <span className="flex min-w-0 flex-1 flex-col text-start">
            <span className="font-display text-base leading-tight font-bold">Voir mon panier</span>
            <span className="text-xs font-semibold tabular-nums opacity-80">{itemsLabel}</span>
          </span>
          <span className="shrink-0 font-display text-base font-bold tabular-nums">{formatPrice(total)}</span>
          <span aria-hidden="true" className="shrink-0 text-lg">
            ⌃
          </span>
        </button>
      </div>
      <CartSheet open={open} preview={preview} onClose={() => setOpen(false)} />
    </>
  );
}
