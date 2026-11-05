"use client";

import Link from "next/link";
import { useState } from "react";
import { formatPrice } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { useHydrated } from "@/lib/useHydrated";
import type { Variant } from "@/types/api";
import { clampQuantity, quantityLimit } from "./cartBar";
import { MAX_PER_LINE, addItem } from "./cartSlice";
import QuantityStepper from "./QuantityStepper";

// L'achat d'une variante, avec sa quantité (05/11) : on peut prendre tout le stock réel d'un
// neuf (10 au plus par ligne), moins ce qui est déjà au panier. Une affaire est unique : pas
// de quantité, une seule fois dans le panier.
export default function AddToCartButton({ variant }: { variant: Variant }) {
  const dispatch = useAppDispatch();
  const inCart = useAppSelector((state) => state.cart.items.find((item) => item.sku === variant.sku))?.quantity ?? 0;
  const hydrated = useHydrated();
  const [added, setAdded] = useState(false);
  const [wanted, setWanted] = useState(1);

  // Avant l'hydratation, le serveur ne connaît pas le panier : on compte 0 au panier.
  const limit = quantityLimit(variant, hydrated ? inCart : 0);
  // Changer d'option (stockage) ramène la quantité dans la nouvelle limite.
  const quantity = clampQuantity(wanted, limit);
  const deal = variant.condition === "refurbished";

  if (variant.stock === 0) {
    return (
      <button type="button" className="btn btn-secondary w-full" disabled>
        Rupture de stock
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {!deal && limit > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <QuantityStepper value={quantity} max={limit} onChange={setWanted} />
          <span className="text-sm text-ink-muted">
            {inCart > 0 && hydrated
              ? `${inCart} déjà au panier, encore ${limit} possible${limit > 1 ? "s" : ""}`
              : `${Math.min(variant.stock, MAX_PER_LINE)} au plus`}
          </span>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn btn-primary flex-1"
          disabled={limit === 0}
          onClick={() => {
            dispatch(addItem({ sku: variant.sku, quantity, max: quantity + (hydrated ? inCart : 0) }));
            setAdded(true);
            setWanted(1);
          }}
        >
          {limit === 0
            ? deal
              ? "Déjà dans votre panier"
              : "Déjà au maximum dans votre panier"
            : `Ajouter au panier · ${formatPrice(variant.price * quantity)}`}
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
    </div>
  );
}
