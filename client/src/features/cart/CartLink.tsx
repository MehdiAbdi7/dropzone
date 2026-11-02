"use client";

import Link from "next/link";
import { useAppSelector } from "@/lib/hooks";
import { useHydrated } from "@/lib/useHydrated";

// Le lien vers le panier, avec le nombre d'articles. Le nombre n'apparaît qu'une
// fois le panier relu (hydrated) : le serveur ne connaît pas le panier du visiteur.
export default function CartLink() {
  const { items, hydrated: loaded } = useAppSelector((state) => state.cart);
  const hydrated = useHydrated() && loaded;
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Link
      href="/panier"
      className="btn btn-primary btn-small"
      aria-label={hydrated ? `Panier, ${count} article${count > 1 ? "s" : ""}` : "Panier"}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M6 7h15l-1.5 9h-12z" />
        <path d="M6 7 5 3H2" />
        <circle cx="9" cy="20" r="1.5" />
        <circle cx="18" cy="20" r="1.5" />
      </svg>
      <span>Panier</span>
      {hydrated && count > 0 ? (
        <span className="rounded-full bg-black/30 px-2 text-xs tabular-nums">{count}</span>
      ) : null}
    </Link>
  );
}
