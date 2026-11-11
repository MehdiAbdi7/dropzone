"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import type { Category } from "@/types/api";
import CategoryArt from "./CategoryArt";

// La barre des catégories de la Boutique : de petites cartes avec la photo et le nom, rien
// d'autre (refonte du 11/11 au soir). La catégorie en cours : fond et bordure bleus ; les autres
// ont une bordure simple. Une catégorie sans produit reste visible, grisée, barrée et sans lien :
// ce qui manque se voit, mais ne se clique pas.
//
// Chaque carte est un vrai lien (`/boutique/<catégorie>`), donc clic droit, nouvel onglet et
// partage fonctionnent, et la page marche même sans JavaScript. Un clic simple est intercepté :
// `onSelect` change la catégorie sur place, sans recharger. Les clics avec Ctrl, Cmd, Maj ou le
// bouton du milieu gardent leur sens habituel (ouvrir ailleurs).
export default function CategoryRail({
  categories,
  currentSlug,
  onSelect,
}: {
  categories: Category[];
  currentSlug: string;
  onSelect: (slug: string) => void;
}) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>, slug: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    onSelect(slug);
  }

  return (
    <nav aria-label="Catégories">
      {/* pt-1 -mt-1 : la barre rogne ce qui dépasse (overflow-x), donc la carte soulevée au survol
          (-translate-y-0.5) aurait son haut coupé. On lui rend la place sans décaler la page. */}
      <ul className="-mx-4 -mt-1 flex justify-center-safe gap-2.5 overflow-x-auto px-4 pt-1 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {categories.map((category) => {
          const current = category.slug === currentSlug;
          const empty = category.productCount === 0;
          const body = (
            <>
              {/* overflow-hidden : le cadre 5:4 de CategoryArt dépasse un peu sous sa vignette, et
                  comme la barre défile à l'horizontale (overflow-x), ce débord la ferait défiler
                  aussi à la verticale. */}
              <span className="relative mx-2 mt-1.5 block h-11 overflow-hidden sm:mx-2.5 sm:mt-2 sm:h-[72px]">
                <CategoryArt
                  category={{ kind: category.kind, photos: category.photos, fallbackImage: category.fallbackImage }}
                  className="absolute inset-0"
                  sizes="160px"
                />
              </span>
              <span
                className={`block px-2 pt-0.5 pb-2 text-center font-display text-xs leading-tight font-bold sm:truncate sm:pb-2.5 sm:text-sm ${
                  current ? "text-blue-ink" : ""
                } ${empty ? "line-through" : ""}`}
              >
                {category.name}
              </span>
            </>
          );
          // La largeur est sur l'élément de liste : fixe sur téléphone (la barre défile), parts
          // égales à partir de sm, sans devenir énormes quand il y a peu de catégories. La rangée
          // est centrée (`justify-center-safe`) : avec 2 catégories ou avec 8, elle reste
          // équilibrée ; « safe » garde le début accessible quand elle déborde et défile.
          const frame = "block w-full rounded-[var(--radius-card)] border-2";
          return (
            <li key={category.slug} className="flex w-28 shrink-0 sm:w-auto sm:max-w-48 sm:min-w-0 sm:flex-1">
              {empty ? (
                <div aria-disabled="true" className={`${frame} border-line bg-surface opacity-45`}>
                  {body}
                </div>
              ) : (
                <Link
                  href={`/boutique/${category.slug}`}
                  onClick={(event) => handleClick(event, category.slug)}
                  aria-current={current ? "page" : undefined}
                  className={`${frame} transition-[border-color,background-color,transform] ${
                    current ? "border-blue bg-blue-soft" : "border-line bg-surface hover:-translate-y-0.5 hover:border-ink-muted"
                  }`}
                >
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
