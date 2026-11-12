"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type MouseEvent, useEffect } from "react";
import BrandLogo from "@/components/ui/BrandLogo";
import type { Palette } from "@/config/colors";
import Breadcrumb from "@/features/shop/Breadcrumb";
import ModelCard from "@/features/shop/ModelCard";
import SeriesCard from "@/features/shop/SeriesCard";
import type { BrandSeries, Category, ProductCard } from "@/types/api";
import ShopSearch from "./ShopSearch";
import { brandSlugFromPath, pickBrand, tabTitle } from "./tiles";

const OTHERS = "autres";

// La page d'une catégorie d'appareils (refonte du 12/11, décision de Mehdi) : directement les
// affiches des séries, avec des puces de marques au-dessus. Un clic sur une puce change les séries
// sur place, sans recharger : toutes les marques et leurs séries sont déjà là (`GET /series` sans
// marque, lu par la page). L'adresse suit (`/boutique/smartphones/samsung`) par
// `history.pushState`, et la marque affichée se relit dans l'adresse (`usePathname`) : un lien
// copié ouvre la bonne marque, et le bouton « précédent » ramène à la marque d'avant.
// « Autres » : les produits de la catégorie sans marque, en grille de modèles.
export default function DeviceBrowser({
  category,
  groups,
  others,
  palette,
}: {
  category: Category;
  groups: BrandSeries[];
  others: ProductCard[];
  palette: Palette;
}) {
  const pathname = usePathname();
  const wanted = brandSlugFromPath(pathname, category.slug);
  const showOthers = wanted === OTHERS && others.length > 0;
  const group = showOthers ? undefined : pickBrand(groups, wanted);
  const current = showOthers ? OTHERS : group?.brand.slug;
  const currentName = showOthers ? "Autres" : group?.brand.name;

  function select(event: MouseEvent<HTMLAnchorElement>, slug: string) {
    // Ctrl, Cmd, Maj ou le bouton du milieu : ouvrir ailleurs, comme un lien ordinaire.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    window.history.pushState(null, "", `/boutique/${category.slug}/${slug}`);
  }

  // Le titre de l'onglet suit la marque : la page ne se recharge pas, Next ne le recalcule pas.
  useEffect(() => {
    document.title = tabTitle(document.title, currentName ? [currentName, category.name] : [category.name]);
  }, [currentName, category.name]);

  const chip = (slug: string, name: string, logoUrl: string | null) => (
    <li key={slug} className="shrink-0">
      <Link
        href={`/boutique/${category.slug}/${slug}`}
        onClick={(event) => select(event, slug)}
        aria-current={current === slug ? "page" : undefined}
        className={`flex items-center gap-2 rounded-full border px-4 py-2 font-display text-sm font-bold transition-colors ${
          current === slug ? "border-blue bg-blue text-on-brand" : "border-line bg-surface text-ink-muted hover:border-ink-muted hover:text-ink"
        }`}
      >
        {logoUrl ? <BrandLogo url={logoUrl} size={16} width={logoUrl.startsWith("/brands/") ? 40 : 16} /> : null}
        {name}
      </Link>
    </li>
  );

  return (
    <div className="container-page space-y-5 py-8">
      <Breadcrumb items={[{ label: "Boutique", href: "/boutique" }, { label: category.name }]} />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl">{category.name}</h1>
          <p className="text-ink-muted">Choisis ta série, de la plus récente à la plus ancienne.</p>
        </div>
        <ShopSearch category={category.slug} />
      </header>

      {/* Les puces restent en haut au défilement ; sur téléphone elles défilent de côté. */}
      <nav aria-label="Marques" className="sticky top-0 z-20 -mx-4 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur md:mx-0 md:px-0">
        <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none] md:flex-wrap md:overflow-visible">
          {groups.map((one) => chip(one.brand.slug, one.brand.name, one.brand.logoUrl))}
          {others.length > 0 ? chip(OTHERS, "Autres", null) : null}
        </ul>
      </nav>

      {/* Dit aux lecteurs d'écran que la liste a changé : le clic ne déplace pas la page. */}
      <p role="status" className="sr-only">
        {showOthers ? `Autres : ${others.length} modèles` : group ? `${group.brand.name} : ${group.series.length} séries` : ""}
      </p>

      {showOthers ? (
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {others.map((product) => (
            <li key={product.id} className="flex">
              <ModelCard product={product} sizes="(min-width: 1024px) 280px, (min-width: 768px) 33vw, 50vw" />
            </li>
          ))}
        </ul>
      ) : group ? (
        // Deux affiches par ligne sur téléphone, trois sur grand écran.
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
          {group.series.map((one, index) => (
            <li key={one.slug}>
              <SeriesCard
                series={one}
                href={`/boutique/${category.slug}/${group.brand.slug}/${one.slug}`}
                palette={palette}
                priority={index === 0}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="card p-6">Aucun appareil de cette catégorie pour le moment.</p>
      )}
    </div>
  );
}
