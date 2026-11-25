"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import ShopSearch from "@/features/categories/ShopSearch";
import Breadcrumb from "@/features/shop/Breadcrumb";
import { CAPSULE_WRAP } from "@/features/shop/capsule";
import { accessoryMakerOptions, accessoryTypeOptions } from "@/features/shop/filterOptions";
import FilterPicker from "@/features/shop/FilterPicker";
import type { AccessoryCatalog } from "@/types/api";
import AccessoryCard from "./AccessoryCard";
import AccessoryDialog from "./AccessoryDialog";
import { type AccessoryFilters, filtersHref, readFilters, visibleProducts } from "./filters";

// La page d'une catégorie d'accessoires (refonte du 12/11, décision de Mehdi) : une seule page,
// deux filtres (le type, puis la marque quand le type en a), et une fenêtre d'achat par carte.
// Les filtres sont dans l'adresse (`?type=coques&marque=samsung`) : un lien copié rouvre le même
// filtre. Un clic change l'adresse par `history.pushState`, sans recharger ; `useSearchParams`
// suit, donc le bouton « précédent » ramène au filtre d'avant.
export default function AccessoryBrowser({ catalog }: { catalog: AccessoryCatalog }) {
  const filters = readFilters(useSearchParams(), catalog);
  const [open, setOpen] = useState<string | null>(null);
  const makerOptions = accessoryMakerOptions(catalog, filters.type);
  const products = visibleProducts(catalog, filters);
  const types = catalog.types.filter((type) => !filters.type || type.slug === filters.type);
  const go = (next: AccessoryFilters) => window.history.pushState(null, "", filtersHref(catalog.category.slug, next));

  return (
    <div className="container-page space-y-5 py-8">
      <Breadcrumb items={[{ label: "Boutique", href: "/boutique" }, { label: catalog.category.name }]} />
      <header className="space-y-1">
        <h1 className="text-3xl">{catalog.category.name}</h1>
        <p className="text-ink-muted">Filtre, puis choisis ton accessoire.</p>
      </header>

      {/* La capsule (25/11, demande de Mehdi) : la recherche et deux listes, collées sous l'en-tête
          au défilement. Remplace les rangées de puces, qui disparaissaient sous l'en-tête. */}
      <div className={CAPSULE_WRAP}>
        <div className="filter-capsule">
          <ShopSearch category={catalog.category.slug} className="min-w-0 flex-1 max-sm:basis-full" />
          <FilterPicker
            label="Type"
            emptyText="Tous"
            options={accessoryTypeOptions(catalog)}
            value={filters.type}
            onChange={(type) => go({ type, maker: null })}
          />
          {makerOptions.length > 0 ? (
            <FilterPicker
              label="Marque"
              emptyText="Toutes"
              options={makerOptions}
              value={filters.maker}
              onChange={(maker) => go({ type: filters.type, maker })}
            />
          ) : null}
          {filters.type ? (
            <button type="button" onClick={() => go({ type: null, maker: null })} className="px-2 text-sm font-bold text-blue-ink max-sm:hidden">
              Effacer
            </button>
          ) : null}
        </div>
      </div>

      <p role="status" className="sr-only">
        {products.length} accessoire{products.length > 1 ? "s" : ""}
      </p>

      {types.map((type) => {
        const list = products.filter((product) => product.type === type.slug);
        return (
          <section key={type.slug} aria-labelledby={`type-${type.slug}`} className="space-y-3">
            <h2 id={`type-${type.slug}`} className="text-lg">
              {type.name}
            </h2>
            {list.length === 0 ? (
              <p className="text-ink-muted">Rien dans cette marque.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {list.map((item) => (
                  <li key={item.slug} className="flex">
                    <AccessoryCard item={item} onOpen={() => setOpen(item.slug)} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <AccessoryDialog slug={open} onClose={() => setOpen(null)} />
    </div>
  );
}
