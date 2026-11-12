"use client";

import Link from "next/link";
import { useInfiniteCarousel } from "@/features/carousel/useInfiniteCarousel";
import type { Category } from "@/types/api";
import CategoryArt from "./CategoryArt";

// Les catégories de l'accueil (refonte du 11/11 au soir) : des cartes toutes pareilles, la photo
// et le nom, rien d'autre, qui défilent seules en boucle. C'est ce qui enlève le côté statique de
// la page sans empiler d'effets. Chaque carte mène à sa catégorie dans la Boutique.
//
// Sur ordinateur, la fenêtre du carrousel est étroite (600 px, deux cartes et demie) : avec trois
// ou quatre catégories seulement, une fenêtre plus large montrerait déjà la première de nouveau à
// côté de la dernière. Les bords s'effacent en fondu au lieu de s'arrêter net.
export default function CategoryCarousel({ categories }: { categories: Category[] }) {
  const { scrollerRef, handleScroll, scrollerHandlers } = useInfiniteCarousel(categories.length);

  return (
    // dir="ltr" même en arabe : la boucle calcule ses positions avec scrollLeft, qui devient
    // négatif dans un conteneur de droite à gauche.
    // Sur grand écran (lg), la fenêtre s'élargit jusqu'aux traits de néon des bords de la section
    // (NeonSides, environ 260 px chacun) : toute la largeur, moins 36 rem pour les deux côtés.
    <div dir="ltr" className="sm:mx-auto sm:max-w-[600px] lg:max-w-[min(1200px,calc(100vw-36rem))]">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        {...scrollerHandlers}
        role="region"
        aria-label="Catégories"
        // Ni scroll-snap ni scroll-smooth : voir l'avertissement en tête de useInfiniteCarousel.
        // `py-4 -my-4` : overflow-x force overflow-y à « auto », ce qui rognerait l'ombre et le
        // léger soulèvement des cartes au survol ; on rend l'espace sans décaler la page.
        className="scrollbar-hide -mx-4 -my-4 flex gap-3 overflow-x-auto overscroll-x-contain px-4 py-4 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] sm:mx-0 sm:gap-4 sm:px-1"
      >
        {/* Trois copies : c'est ce qui donne la boucle. Les deux latérales sont cachées aux
            lecteurs d'écran et hors parcours clavier : la liste ne doit être lue qu'une fois. */}
        {[0, 1, 2].map((copy) =>
          categories.map((category) => (
            <Link
              key={`${copy}-${category.slug}`}
              href={`/boutique/${category.slug}`}
              aria-hidden={copy !== 1}
              tabIndex={copy !== 1 ? -1 : undefined}
              className="card group block shrink-0 basis-[32%] transition-[border-color,transform] sm:basis-[250px] sm:hover:-translate-y-0.5"
            >
              {/* overflow-hidden : le cadre de CategoryArt dépasse un peu sous la vignette, ce qui
                  ferait défiler le carrousel à la verticale (voir plus haut, overflow-x). */}
              <span className="relative block h-20 overflow-hidden sm:h-48">
                <CategoryArt
                  category={{ kind: category.kind, photos: category.photos, fallbackImage: category.fallbackImage }}
                  className="absolute inset-x-2 top-3 bottom-0 sm:inset-x-3 sm:top-4"
                  sizes="250px"
                />
              </span>
              <span className="block px-1 pt-1 pb-2 text-center font-display text-[0.7rem] font-bold sm:px-3 sm:pb-4 sm:text-lg">{category.name}</span>
            </Link>
          )),
        )}
      </div>
    </div>
  );
}
