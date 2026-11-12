import { SearchIcon } from "@/components/ui/icons";

// Le champ « Chercher un modèle… » des pages de la Boutique. Une simple form GET : chercher
// marche même sans JavaScript. `category` limite la recherche à la catégorie de la page.
export default function ShopSearch({ category }: { category?: string }) {
  return (
    <form action="/produits" role="search" className="relative w-full sm:w-80">
      <label htmlFor="shop-search" className="sr-only">
        Quel modèle cherches-tu ?
      </label>
      <SearchIcon className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-muted" />
      <input id="shop-search" name="q" type="search" className="input w-full ps-10" placeholder="Chercher un modèle…" />
      {category ? <input type="hidden" name="category" value={category} /> : null}
    </form>
  );
}
