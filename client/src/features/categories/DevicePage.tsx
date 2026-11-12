import { getPalette } from "@/lib/palette";
import { publicFetch, publicFetchPage } from "@/lib/publicFetch";
import type { BrandSeries, Category, ProductCard } from "@/types/api";
import DeviceBrowser from "./DeviceBrowser";

// La page d'une catégorie d'appareils, la même pour `/boutique/smartphones` et
// `/boutique/smartphones/samsung` (refonte du 12/11) : toutes les marques et leurs séries d'un
// coup, plus les produits sans marque (puce « Autres ») s'il y en a. La marque affichée se lit
// dans l'adresse, côté navigateur (DeviceBrowser).
export default async function DevicePage({ category }: { category: Category }) {
  const [groups, others, palette] = await Promise.all([
    publicFetch<BrandSeries[]>(`/series?category=${category.slug}`),
    category.hasUnbranded
      ? publicFetchPage<ProductCard>(`/products?category=${category.slug}&brand=autres&sort=sortie&limit=50`)
      : Promise.resolve(null),
    getPalette(),
  ]);
  if (!groups) {
    return (
      <div className="container-page py-8">
        <p role="alert" className="card p-6">
          La boutique ne répond pas pour le moment. Rechargez la page dans quelques secondes.
        </p>
      </div>
    );
  }
  return <DeviceBrowser category={category} groups={groups} others={others?.data ?? []} palette={palette} />;
}
