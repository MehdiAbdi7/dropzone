"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import type { Palette } from "@/config/colors";
import Breadcrumb from "@/features/shop/Breadcrumb";
import { CAPSULE_WRAP } from "@/features/shop/capsule";
import { deviceBrandOptions, OTHERS } from "@/features/shop/filterOptions";
import FilterPicker from "@/features/shop/FilterPicker";
import ModelCard from "@/features/shop/ModelCard";
import SeriesCard from "@/features/shop/SeriesCard";
import type { BrandSeries, Category, ProductCard } from "@/types/api";
import ShopSearch from "./ShopSearch";
import { brandSlugFromPath, pickBrand, tabTitle } from "./tiles";

// Hors du composant : le titre de l'onglet est un effet sur le document, pas un état de React.
function setTabTitle(parts: string[]) {
  document.title = tabTitle(document.title, parts);
}

// La page d'une catégorie d'appareils (refonte du 12/11, décision de Mehdi) : directement les
// affiches des séries, avec la capsule de filtres au-dessus (la recherche et la liste des marques).
// Choisir une marque change les séries sur place, sans recharger : toutes les marques et leurs
// séries sont déjà là (`GET /series` sans
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

  // Choisir une marque dans la liste : l'adresse change sans recharger (la marque affichée se relit
  // dans l'adresse). La liste n'a pas de ligne « aucune marque » : `null` n'arrive jamais ici.
  function select(slug: string | null) {
    if (slug) {
      window.history.pushState(null, "", `/boutique/${category.slug}/${slug}`);
    }
  }

  // Le titre de l'onglet suit la marque : la page ne se recharge pas, Next ne le recalcule pas.
  useEffect(() => {
    setTabTitle(currentName ? [currentName, category.name] : [category.name]);
  }, [currentName, category.name]);

  return (
    <div className="container-page space-y-5 py-8">
      <Breadcrumb items={[{ label: "Boutique", href: "/boutique" }, { label: category.name }]} />
      <header className="space-y-1">
        <h1 className="text-3xl">{category.name}</h1>
        <p className="text-ink-muted">Choisis ta série, de la plus récente à la plus ancienne.</p>
      </header>

      {/* La capsule (25/11, demande de Mehdi) : la recherche et la liste des marques, collées sous
          l'en-tête au défilement. Même capsule que la page Accessoires. Remplace les puces de
          marques, qui disparaissaient sous l'en-tête et qu'on ne devinait pas à faire défiler. */}
      <div className={CAPSULE_WRAP}>
        <div className="filter-capsule">
          <ShopSearch category={category.slug} className="min-w-0 flex-1 max-sm:basis-full" />
          <FilterPicker
            label="Marque"
            emptyText="Marque"
            options={deviceBrandOptions(groups, others.length)}
            value={current ?? null}
            onChange={select}
          />
        </div>
      </div>

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
