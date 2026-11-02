"use client";

import { useState } from "react";
import { OPTION_ORDER } from "@/config/catalog";
import AddToCartButton from "@/features/cart/AddToCartButton";
import { formatPrice } from "@/lib/format";
import type { Condition, Variant } from "@/types/api";
import ConditionReport from "./ConditionReport";
import GiftList from "./GiftList";

type RefurbSort = "price" | "grade" | "battery";

const rankOf = (key: string) => (OPTION_ORDER.includes(key) ? OPTION_ORDER.indexOf(key) : OPTION_ORDER.length);

// Le choix d'achat d'une fiche produit : l'onglet Neuf (choisir ses options)
// et l'onglet Reconditionné (comparer les appareils disponibles).
export default function ProductPurchase({ variants }: { variants: Variant[] }) {
  const newVariants = variants.filter((variant) => variant.condition === "new");
  const refurbished = variants.filter((variant) => variant.condition === "refurbished");
  const newInStock = newVariants.some((variant) => variant.stock > 0);

  // L'onglet ouvert au départ : le neuf s'il y en a en stock, sinon le reconditionné.
  const [tab, setTab] = useState<Condition>(
    newVariants.length === 0 || (!newInStock && refurbished.length > 0) ? "refurbished" : "new",
  );

  const tabs = [
    { value: "new" as const, label: "Neuf", count: newVariants.length },
    { value: "refurbished" as const, label: "Reconditionné", count: refurbished.length },
  ].filter((item) => item.count > 0);

  return (
    <section aria-label="Acheter" className="space-y-5">
      {tabs.length > 1 ? (
        <div role="tablist" aria-label="État de l'appareil" className="inline-flex rounded-lg border border-line bg-surface p-1">
          {tabs.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              id={`tab-${item.value}`}
              aria-selected={tab === item.value}
              aria-controls={`panel-${item.value}`}
              onClick={() => setTab(item.value)}
              className={`rounded-md px-4 py-2 text-sm font-bold ${
                tab === item.value ? "bg-blue text-on-brand" : "text-ink-muted hover:text-ink"
              }`}
            >
              {item.label} <span className="font-normal opacity-80">({item.count})</span>
            </button>
          ))}
        </div>
      ) : null}

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={tabs.length > 1 ? `tab-${tab}` : undefined}>
        {tab === "new" ? <NewPicker variants={newVariants} /> : <RefurbishedList variants={refurbished} />}
      </div>
    </section>
  );
}

// ---------- Neuf : choisir ses options ----------

function NewPicker({ variants }: { variants: Variant[] }) {
  const first = variants.find((variant) => variant.stock > 0) ?? variants[0];
  const [selected, setSelected] = useState<Record<string, string>>(first.options);

  // Les options proposées (Stockage, puis RAM, puis Couleur…), et pour chacune
  // toutes ses valeurs, dans l'ordre des variantes (déjà triées par prix).
  const keys = [...new Set(variants.flatMap((variant) => Object.keys(variant.options)))].sort(
    (a, b) => rankOf(a) - rankOf(b),
  );
  const valuesOf = (key: string) => [...new Set(variants.map((variant) => variant.options[key]).filter(Boolean))];

  const matches = (variant: Variant, wanted: Record<string, string>) =>
    keys.every((key) => variant.options[key] === wanted[key]);
  const current = variants.find((variant) => matches(variant, selected));

  function choose(key: string, value: string) {
    const wanted = { ...selected, [key]: value };
    // Si la combinaison n'existe pas, on prend la première variante qui a cette valeur.
    const exact = variants.find((variant) => matches(variant, wanted));
    const fallback = variants.find((variant) => variant.options[key] === value);
    setSelected((exact ?? fallback ?? first).options);
  }

  return (
    <div className="space-y-5">
      {keys.map((key) => (
        <fieldset key={key}>
          <legend className="label">{key}</legend>
          <div className="flex flex-wrap gap-2">
            {valuesOf(key).map((value) => (
              <button
                key={value}
                type="button"
                className="chip"
                aria-pressed={selected[key] === value}
                onClick={() => choose(key, value)}
              >
                {value}
              </button>
            ))}
          </div>
        </fieldset>
      ))}

      {current ? (
        <div className="card space-y-4 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="font-display text-3xl font-bold">
              {formatPrice(current.price)} <span className="text-base font-semibold text-ink-muted">TTC</span>
            </p>
            <StockLine stock={current.stock} />
          </div>
          <GiftList gifts={current.gifts} />
          <AddToCartButton variant={current} />
        </div>
      ) : null}
    </div>
  );
}

function StockLine({ stock }: { stock: number }) {
  if (stock === 0) {
    return <p className="font-semibold text-red">Rupture de stock</p>;
  }
  if (stock <= 2) {
    return <p className="font-semibold text-amber">Plus que {stock} en stock</p>;
  }
  return <p className="font-semibold text-blue-ink">En stock</p>;
}

// ---------- Reconditionné : comparer les appareils ----------

const SORTS: Record<RefurbSort, { label: string; compare: (a: Variant, b: Variant) => number }> = {
  price: { label: "Prix croissant", compare: (a, b) => a.price - b.price },
  grade: { label: "Meilleure note", compare: (a, b) => (b.grade ?? 0) - (a.grade ?? 0) || a.price - b.price },
  battery: {
    label: "Meilleure batterie",
    compare: (a, b) => (b.batteryHealth ?? 0) - (a.batteryHealth ?? 0) || a.price - b.price,
  },
};

function RefurbishedList({ variants }: { variants: Variant[] }) {
  const [sort, setSort] = useState<RefurbSort>("price");
  const sorted = [...variants].sort(SORTS[sort].compare);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          {variants.length} appareil{variants.length > 1 ? "s" : ""} disponible{variants.length > 1 ? "s" : ""}. Chacun est
          unique : prix TTC, testé et décrit pièce par pièce.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-ink-muted">Trier</span>
          <select
            className="input min-h-9 w-auto py-1"
            value={sort}
            onChange={(event) => setSort(event.target.value as RefurbSort)}
          >
            {Object.entries(SORTS).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ul className="space-y-4">
        {sorted.map((variant) => (
          <li key={variant.sku}>
            <ConditionReport variant={variant} action={<AddToCartButton variant={variant} />} />
          </li>
        ))}
      </ul>
    </div>
  );
}
