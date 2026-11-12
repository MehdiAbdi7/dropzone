"use client";

import { useInfiniteCarousel } from "@/features/carousel/useInfiniteCarousel";
import ProductCard from "@/features/products/ProductCard";
import type { ProductCard as ProductCardData } from "@/types/api";
import { ArrowRightIcon } from "@/components/ui/icons";

// Les derniers arrivages de l'accueil (12/11, demande de Mehdi) : les appareils que le magasin
// vient d'ajouter à son stock (nouvel exemplaire ou stock augmenté), dans un carrousel qui défile
// seul en boucle, comme celui des catégories. Il se saisit au doigt ou à la molette.
export default function ArrivalsCarousel({ products }: { products: ProductCardData[] }) {
  const { scrollerRef, handleScroll, scrollerHandlers, scrollManually } =
    useInfiniteCarousel(products.length, 34);

  return (
    // dir="ltr" même en arabe : la boucle calcule ses positions avec scrollLeft (voir CategoryCarousel).
    <div dir="ltr" className="relative px-11">
      <div
        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-between"
        role="group"
        aria-label="Commandes des derniers arrivages"
      >
        <button
          type="button"
          aria-label="Produits précédents"
          aria-controls="latest-arrivals-carousel"
          className="icon-btn pointer-events-auto border border-line bg-surface/95 shadow-sm backdrop-blur transition-[transform,border-color,background-color,color] hover:scale-105 hover:border-blue-ink hover:bg-surface-2 hover:text-blue-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-ink sm:shadow-lg"
          onClick={() => scrollManually(-1)}
        >
          <ArrowRightIcon size={18} className="rotate-180" />
        </button>
        <button
          type="button"
          aria-label="Produits suivants"
          aria-controls="latest-arrivals-carousel"
          className="icon-btn pointer-events-auto border border-line bg-surface/95 shadow-sm backdrop-blur transition-[transform,border-color,background-color,color] hover:scale-105 hover:border-blue-ink hover:bg-surface-2 hover:text-blue-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-ink sm:shadow-lg"
          onClick={() => scrollManually(1)}
        >
          <ArrowRightIcon size={18} />
        </button>
      </div>
      <div
        id="latest-arrivals-carousel"
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
              className="flex min-w-[128px] shrink-0 basis-[35vw] sm:min-w-0 sm:basis-[230px]"
            >
              <ProductCard product={product} sizes="(min-width: 640px) 230px, 35vw" />
            </div>
          )),
        )}
      </div>
    </div>
  );
}
