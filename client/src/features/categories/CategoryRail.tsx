import Link from "next/link";
import type { Category } from "@/types/api";
import CategoryArt from "./CategoryArt";

// La barre des catégories de la Boutique (11/11) : toujours visible au-dessus des marques. Chaque
// carte montre l'image de la catégorie en grand (la même composition que sur l'accueil,
// CategoryArt) et son nom, rien d'autre (demande de Mehdi). La catégorie en cours se voit d'un
// coup d'œil : fond et bordure bleus pleins, nom en bleu ; les autres ont une bordure simple,
// sans le dégradé des cartes, pour que les deux états ne se mélangent pas.
// Une catégorie sans produit reste visible, grisée, barrée et sans lien : ce qui manque se voit,
// mais ne se clique pas (règle du parcours). Sur téléphone, la barre défile à l'horizontale.
export default function CategoryRail({ categories, currentSlug }: { categories: Category[]; currentSlug: string }) {
  return (
    <nav aria-label="Catégories">
      <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {categories.map((category) => {
          const current = category.slug === currentSlug;
          const empty = category.productCount === 0;
          const body = (
            <>
              <span className="relative block h-24 sm:h-28">
                <CategoryArt
                  category={{ kind: category.kind, photos: category.photos, fallbackImage: category.fallbackImage }}
                  className="absolute inset-x-3 top-3 bottom-1"
                  sizes="200px"
                />
              </span>
              <span
                className={`block truncate px-3 pt-1 pb-3 text-center font-display text-sm font-bold sm:text-base ${
                  current ? "text-blue-ink" : ""
                } ${empty ? "line-through" : ""}`}
              >
                {category.name}
              </span>
            </>
          );
          // La largeur est sur l'élément de liste : 9 rem chacune sur téléphone (la barre défile),
          // parts égales à partir de sm.
          const frame = "block rounded-[var(--radius-card)] border-2";
          return (
            <li key={category.slug} className="flex w-36 shrink-0 sm:w-auto sm:min-w-0 sm:flex-1">
              {empty ? (
                <div aria-disabled="true" className={`${frame} w-full border-line bg-surface opacity-45`}>
                  {body}
                </div>
              ) : (
                <Link
                  href={`/boutique/${category.slug}`}
                  aria-current={current ? "page" : undefined}
                  className={`${frame} w-full transition-[border-color,background-color,transform] ${
                    current
                      ? "border-blue bg-blue-soft"
                      : "border-line bg-surface hover:-translate-y-0.5 hover:border-ink-muted"
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
