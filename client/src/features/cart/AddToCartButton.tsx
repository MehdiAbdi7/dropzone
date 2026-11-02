"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useHydrated } from "@/lib/useHydrated";
import type { Variant } from "@/types/api";
import { MAX_PER_LINE, addItem } from "./cartSlice";

export default function AddToCartButton({ variant }: { variant: Variant }) {
  const dispatch = useAppDispatch();
  const inCart = useAppSelector((state) => state.cart.items.find((item) => item.sku === variant.sku));
  const hydrated = useHydrated();
  const [added, setAdded] = useState(false);

  // Un reconditionné est unique : une seule fois dans le panier.
  // Avant l'hydratation, le bouton est celui du serveur (qui ne connaît pas le panier).
  const max = variant.condition === "refurbished" ? 1 : Math.min(variant.stock, MAX_PER_LINE);
  const full = hydrated && (inCart?.quantity ?? 0) >= max;

  if (variant.stock === 0) {
    return (
      <button type="button" className="btn btn-secondary w-full" disabled>
        Rupture de stock
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        className="btn btn-primary flex-1"
        disabled={full}
        onClick={() => {
          dispatch(addItem({ sku: variant.sku, quantity: 1, max }));
          setAdded(true);
        }}
      >
        {full ? "Déjà dans votre panier" : "Ajouter au panier"}
      </button>
      {/* aria-live : un lecteur d'écran annonce l'ajout. */}
      <p aria-live="polite" className="text-sm">
        {added ? (
          <Link href="/panier" className="font-semibold text-blue-ink underline">
            Voir le panier
          </Link>
        ) : null}
      </p>
    </div>
  );
}
