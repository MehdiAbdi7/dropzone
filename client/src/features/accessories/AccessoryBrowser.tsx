"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import BrandLogo from "@/components/ui/BrandLogo";
import ShopSearch from "@/features/categories/ShopSearch";
import Breadcrumb from "@/features/shop/Breadcrumb";
import type { AccessoryCatalog } from "@/types/api";
import AccessoryCard from "./AccessoryCard";
import AccessoryDialog from "./AccessoryDialog";
import { type AccessoryFilters, filtersHref, makersOf, readFilters, visibleProducts } from "./filters";

// La page d'une catégorie d'accessoires (refonte du 12/11, décision de Mehdi) : une seule page,
// deux filtres (le type, puis la marque quand le type en a), et une fenêtre d'achat par carte.
// Les filtres sont dans l'adresse (`?type=coques&marque=samsung`) : un lien copié rouvre le même
// filtre. Un clic change l'adresse par `history.pushState`, sans recharger ; `useSearchParams`
// suit, donc le bouton « précédent » ramène au filtre d'avant.
export default function AccessoryBrowser({ catalog }: { catalog: AccessoryCatalog }) {
  const filters = readFilters(useSearchParams(), catalog);
  const [open, setOpen] = useState<string | null>(null);
  const makers = makersOf(catalog, filters.type);
  const products = visibleProducts(catalog, filters);
  const types = catalog.types.filter((type) => !filters.type || type.slug === filters.type);
  const go = (next: AccessoryFilters) => window.history.pushState(null, "", filtersHref(catalog.category.slug, next));

  const chip = (key: string, label: string, on: boolean, onClick: () => void, extra?: React.ReactNode) => (
    <button
      key={key}
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
        on ? "border-blue bg-blue text-on-brand" : "border-line bg-surface text-ink-muted hover:border-ink-muted hover:text-ink"
      }`}
    >
      {extra}
      {label}
    </button>
  );
  const rowLabel = "w-14 shrink-0 text-xs font-bold tracking-wide text-ink-muted uppercase";

  return (
    <div className="container-page space-y-5 py-8">
      <Breadcrumb items={[{ label: "Boutique", href: "/boutique" }, { label: catalog.category.name }]} />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl">{catalog.category.name}</h1>
          <p className="text-ink-muted">Filtre, puis choisis ton accessoire.</p>
        </div>
        <ShopSearch category={catalog.category.slug} />
      </header>

      <div className="sticky top-0 z-20 -mx-4 space-y-2.5 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur md:mx-0 md:px-0">
        <div role="group" aria-label="Type" className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] md:flex-wrap md:overflow-visible">
          <span className={rowLabel}>Type</span>
          {chip("type-all", "Tous", !filters.type, () => go({ type: null, maker: null }), <small className="order-last opacity-75">{catalog.products.length}</small>)}
          {catalog.types.map((type) =>
            chip(
              `type-${type.slug}`,
              type.name,
              filters.type === type.slug,
              () => go({ type: type.slug, maker: null }),
              <small className="order-last opacity-75">{catalog.products.filter((product) => product.type === type.slug).length}</small>,
            ),
          )}
        </div>
        {makers.length > 0 ? (
          <div role="group" aria-label="Marque" className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] md:flex-wrap md:overflow-visible">
            <span className={rowLabel}>Marque</span>
            {chip("maker-all", "Toutes", !filters.maker, () => go({ type: filters.type, maker: null }))}
            {makers.map((maker) =>
              chip(
                `maker-${maker.slug}`,
                maker.name,
                filters.maker === maker.slug,
                () => go({ type: filters.type, maker: maker.slug }),
                maker.logoUrl ? <BrandLogo url={maker.logoUrl} size={14} width={maker.logoUrl.startsWith("/brands/") ? 34 : 14} /> : null,
              ),
            )}
          </div>
        ) : null}
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
