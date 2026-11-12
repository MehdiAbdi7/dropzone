"use client";

import { useInfiniteCarousel } from "@/features/carousel/useInfiniteCarousel";
import ProductCard from "@/features/products/ProductCard";
import type { ProductCard as ProductCardData } from "@/types/api";

// Les derniers arrivages de l'accueil (12/11, demande de Mehdi) : les appareils que le magasin
// vient d'ajouter à son stock (nouvel exemplaire ou stock augmenté), dans un carrousel qui défile
// seul en boucle, comme celui des catégories. Il se saisit au doigt ou à la molette.
export default function ArrivalsCarousel({ products }: { products: ProductCardData[] }) {
  const { scrollerRef, handleScroll, scrollerHandlers } = useInfiniteCarousel(products.length);

  return (
    // dir="ltr" même en arabe : la boucle calcule ses positions avec scrollLeft (voir CategoryCarousel).
    <div dir="ltr">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        {...scrollerHandlers}
        role="region"
        aria-label="Derniers arrivages"
        // Ni scroll-snap ni scroll-smooth : voir l'avertissement en tête de useInfiniteCarousel.
        // `py-4 -my-4` : overflow-x force overflow-y à « auto », ce qui rognerait l'ombre des
        // cartes au survol ; on rend l'espace sans décaler la page.
        className="scrollbar-hide -mx-4 -my-4 flex gap-3 overflow-x-auto overscroll-x-contain px-4 py-4 [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)] sm:mx-0 sm:gap-4 sm:px-1"
      >
        {/* Trois copies : c'est ce qui donne la boucle. Les deux latérales sont cachées aux
            lecteurs d'écran et hors parcours clavier : la liste ne doit être lue qu'une fois. */}
        {[0, 1, 2].map((copy) =>
          products.map((product) => (
            <div
              key={`${copy}-${product.id}`}
              aria-hidden={copy !== 1}
              // inert : les liens des copies ne se prennent pas au clavier.
              inert={copy !== 1}
              className="flex shrink-0 basis-[45%] sm:basis-[230px]"
            >
              <ProductCard product={product} sizes="(min-width: 640px) 230px, 45vw" />
            </div>
          )),
        )}
      </div>
    </div>
  );
}
