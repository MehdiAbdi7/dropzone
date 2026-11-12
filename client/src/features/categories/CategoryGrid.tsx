import Link from "next/link";
import type { Category } from "@/types/api";
import CategoryArt from "./CategoryArt";

// La page `/boutique` (refonte du 12/11, décision de Mehdi) : les catégories seules, en cartes
// (la composition de photos réglée dans Personnalisation, et le nom). Plus de marques ni de
// types en dessous : on les choisit sur la page de la catégorie. Une catégorie sans produit
// reste visible, grisée, barrée et sans lien (règle du parcours).
export default function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
      {categories.map((category) => {
        const empty = category.productCount === 0;
        const body = (
          <>
            <span className="relative mx-3 mt-3 block aspect-[5/4] overflow-hidden">
              <CategoryArt
                category={{ kind: category.kind, photos: category.photos, fallbackImage: category.fallbackImage }}
                className="absolute inset-0"
                sizes="(min-width: 768px) 260px, 45vw"
              />
            </span>
            <span className={`block px-3 pt-1 pb-4 text-center font-display text-sm font-bold sm:text-base ${empty ? "line-through" : ""}`}>
              {category.name}
            </span>
          </>
        );
        const frame = "block h-full rounded-[var(--radius-block)] border bg-surface";
        return (
          <li key={category.slug} className="flex">
            {empty ? (
              <div aria-disabled="true" className={`${frame} w-full border-line opacity-45`}>
                {body}
              </div>
            ) : (
              <Link
                href={`/boutique/${category.slug}`}
                className={`${frame} w-full border-line transition-[border-color,transform] hover:-translate-y-1 hover:border-blue-ink`}
              >
                {body}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
