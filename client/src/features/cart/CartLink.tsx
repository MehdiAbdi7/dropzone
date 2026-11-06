"use client";

import { CartIcon } from "@/components/ui/icons";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useHydrated } from "@/lib/useHydrated";
import { openCart } from "./cartSlice";
import CartWindow from "./CartWindow";

// Le bouton du panier de l'en-tête, avec la pastille du nombre d'articles. Il ouvre la
// fenêtre du panier (06/11) : le panier n'a plus de page. La fenêtre est montée ici, avec
// l'en-tête, donc présente sur toutes les pages qui l'affichent (boutique et compte).
// Le nombre n'apparaît qu'une fois le panier relu (hydrated) : le serveur ne le connaît pas.
export default function CartLink() {
  const dispatch = useAppDispatch();
  const { items, hydrated: loaded } = useAppSelector((state) => state.cart);
  const hydrated = useHydrated() && loaded;
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <button
        type="button"
        className="icon-btn"
        aria-haspopup="dialog"
        aria-label={hydrated ? `Panier, ${count} article${count > 1 ? "s" : ""}` : "Panier"}
        onClick={() => dispatch(openCart())}
      >
        <CartIcon />
        {hydrated && count > 0 ? (
          <span className="absolute right-0.5 top-0.5 min-w-5 rounded-full bg-red px-1 text-center text-[11px] leading-5 font-bold text-on-red tabular-nums">
            {count}
          </span>
        ) : null}
      </button>
      <CartWindow />
    </>
  );
}
