import Link from "next/link";
import type { Category } from "@/types/api";
import CategoryArt from "./CategoryArt";
import { countLabel } from "./labels";

// La barre des catégories de la Boutique (11/11) : toujours visible au-dessus des marques, la
// catégorie en cours marquée. On change de catégorie en un clic, sans repasser par une page.
// La vignette est la même composition que sur l'accueil (CategoryArt), à plus petite échelle.
// Une catégorie sans produit reste visible, barrée et sans lien : ce qui manque se voit, mais
// ne se clique pas (règle du parcours). Sur téléphone, la barre défile à l'horizontale.
export default function CategoryRail({ categories, currentSlug }: { categories: Category[]; currentSlug: string }) {
  return (
    <nav aria-label="Catégories">
      <ul className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {categories.map((category) => {
          const current = category.slug === currentSlug;
          const empty = category.productCount === 0;
          const body = (
            <>
              <span className="relative size-12 shrink-0 overflow-hidden rounded-field bg-surface-2">
                <CategoryArt category={category} />
              </span>
              <span className="min-w-0">
                <span className={`block truncate font-display font-bold ${empty ? "line-through" : ""}`}>{category.name}</span>
                <span className="block text-xs text-ink-muted">
                  {empty ? "Bientôt" : countLabel(category.kind, category.productCount)}
                </span>
              </span>
            </>
          );
          const className = `card flex min-w-44 shrink-0 items-center gap-3 p-2 pe-4 sm:min-w-0 sm:flex-1 ${current ? "shadow-(--shadow)" : ""}`;
          return (
            <li key={category.slug} className="flex">
              {empty ? (
                <div aria-disabled="true" className={`${className} opacity-50`}>
                  {body}
                </div>
              ) : (
                <Link
                  href={`/boutique/${category.slug}`}
                  aria-current={current ? "page" : undefined}
                  className={`${className} transition-[border-color,transform] hover:-translate-y-0.5 ${current ? "ring-2 ring-blue" : ""}`}
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
