"use client";

import Link from "next/link";
import { CartIcon } from "@/components/ui/icons";
import { useAppSelector } from "@/lib/hooks";
import { useHydrated } from "@/lib/useHydrated";

// Le lien vers le panier, avec la pastille du nombre d'articles. Le nombre n'apparaît
// qu'une fois le panier relu (hydrated) : le serveur ne connaît pas le panier du visiteur.
export default function CartLink() {
  const { items, hydrated: loaded } = useAppSelector((state) => state.cart);
  const hydrated = useHydrated() && loaded;
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Link
      href="/panier"
      className="icon-btn"
      aria-label={hydrated ? `Panier, ${count} article${count > 1 ? "s" : ""}` : "Panier"}
    >
      <CartIcon />
      {hydrated && count > 0 ? (
        <span className="absolute right-0.5 top-0.5 min-w-5 rounded-full bg-red px-1 text-center text-[11px] leading-5 font-bold text-on-red tabular-nums">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
