"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect } from "react";
import { SearchIcon } from "@/components/ui/icons";
import { DEVICE_KINDS } from "@/config/catalog";
import Breadcrumb from "@/features/shop/Breadcrumb";
import type { Category } from "@/types/api";
import BrandGrid from "./BrandGrid";
import CategoryRail from "./CategoryRail";
import { categorySlugFromPath } from "./tiles";

// Les étapes 1 et 2 du parcours sur une seule page (refonte du 11/11 au soir) : la barre des
// catégories, puis les marques de la catégorie choisie. Un clic sur une catégorie change les
// marques tout de suite, sans recharger ni changer de page : toutes les catégories et leurs
// marques sont déjà là, dans la réponse de `GET /categories` lue par la page.
//
// L'adresse reste juste : `history.pushState` la met à jour (`/boutique/tablettes`) sans
// navigation, donc un lien copié ouvre la bonne catégorie. Next voit ce changement : `usePathname`
// suit, et c'est de lui qu'on relit la catégorie affichée. Ainsi le bouton « précédent » du
// navigateur ramène à la catégorie d'avant, sans code de plus. Tant que l'adresse ne dit rien
// d'exploitable, on garde `initialSlug`, la catégorie demandée à l'arrivée sur la page.
export default function ShopBrowser({ categories, initialSlug }: { categories: Category[]; initialSlug: string }) {
  const pathname = usePathname();
  const fromPath = categorySlugFromPath(pathname);
  const category =
    categories.find((item) => item.slug === fromPath) ?? categories.find((item) => item.slug === initialSlug) ?? categories[0];

  const select = useCallback((slug: string) => {
    window.history.pushState(null, "", `/boutique/${slug}`);
  }, []);

  // Le titre de l'onglet suit la catégorie : Next ne le recalcule que lors d'une vraie
  // navigation, or ici la page ne se recharge pas. On garde la fin du titre actuel (« · DropZone
  // (démo) »), qui vient du layout, et on remplace seulement le nom de la catégorie.
  useEffect(() => {
    const suffix = document.title.split(" · ").slice(1).join(" · ");
    document.title = suffix ? `${category.name} · ${suffix}` : category.name;
  }, [category.name]);

  const isDevice = DEVICE_KINDS.includes(category.kind);

  return (
    <div className="container-page space-y-6 py-8">
      <Breadcrumb items={[{ label: "Boutique", href: "/boutique" }, { label: category.name }]} />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl">{category.name}</h1>
          {/* Les accessoires se rangent par type (Coques, Chargeurs…), les appareils par marque. */}
          <p className="text-ink-muted">{isDevice ? "Choisissez une marque." : "Choisissez un type."}</p>
        </div>
        {/* Une simple form GET : chercher marche même sans JavaScript. */}
        <form action="/produits" role="search" className="relative w-full sm:w-80">
          <label htmlFor="shop-search" className="sr-only">
            Quel modèle cherchez-vous ?
          </label>
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input id="shop-search" name="q" type="search" className="input w-full ps-10" placeholder="Chercher un modèle…" />
          <input type="hidden" name="category" value={category.slug} />
        </form>
      </header>

      <CategoryRail categories={categories} currentSlug={category.slug} onSelect={select} />

      {/* Dit aux lecteurs d'écran que la liste a changé : le clic ne déplace pas la page. */}
      <p role="status" className="sr-only">
        {category.name} : {category.brands.length} {isDevice ? "marques" : "types"}
      </p>

      {category.productCount === 0 ? (
        <p className="card p-6">Aucun produit dans cette catégorie pour le moment.</p>
      ) : (
        <BrandGrid category={category} />
      )}
    </div>
  );
}
