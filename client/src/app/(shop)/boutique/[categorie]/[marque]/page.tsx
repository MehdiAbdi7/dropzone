import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEVICE_KINDS } from "@/config/catalog";
import ProductGrid from "@/features/products/ProductGrid";
import Breadcrumb from "@/features/shop/Breadcrumb";
import ModelCard from "@/features/shop/ModelCard";
import SeriesCard from "@/features/shop/SeriesCard";
import { getPalette } from "@/lib/palette";
import { publicFetch, publicFetchPage } from "@/lib/publicFetch";
import type { Category, ProductCard, SeriesSummary } from "@/types/api";

// La catégorie et la marque de l'adresse, si elles existent. « autres » = sans marque.
async function getBrand(categorySlug: string, brandSlug: string) {
  const categories = await publicFetch<Category[]>("/categories");
  const category = categories?.find((item) => item.slug === categorySlug);
  const brand =
    brandSlug === "autres"
      ? category?.hasUnbranded
        ? { name: "Autres", slug: "autres" }
        : undefined
      : category?.brands.find((item) => item.slug === brandSlug);
  return { categories, category, brand };
}

export async function generateMetadata({
  params,
}: PageProps<"/boutique/[categorie]/[marque]">): Promise<Metadata> {
  const { categorie, marque } = await params;
  const { category, brand } = await getBrand(categorie, marque);
  return {
    title: category && brand ? `${brand.name} · ${category.name}` : "Boutique",
  };
}

const UNAVAILABLE = (
  <div className="container-page py-8">
    <p role="alert" className="card p-6">
      La boutique ne répond pas pour le moment. Rechargez la page dans quelques
      secondes.
    </p>
  </div>
);

// Étape 3 du parcours : les séries de la marque en affiches (appareils), ou ses produits
// (accessoires). La carte « Autres » (produits sans marque) garde la grille des modèles.
export default async function ShopBrandPage({
  params,
}: PageProps<"/boutique/[categorie]/[marque]">) {
  const { categorie, marque } = await params;
  const { categories, category, brand } = await getBrand(categorie, marque);
  if (categories && (!category || !brand)) {
    notFound();
  }

  const isDevice = category ? DEVICE_KINDS.includes(category.kind) : false;
  if (category && brand && isDevice && brand.slug !== "autres") {
    // Les séries et la palette (lueur des affiches sans couverture) en même temps.
    const [series, palette] = await Promise.all([
      publicFetch<SeriesSummary[]>(`/series?category=${category.slug}&brand=${brand.slug}`),
      getPalette(),
    ]);
    if (!series) {
      return UNAVAILABLE;
    }
    return (
      <div className="container-page space-y-6 py-8">
        <Breadcrumb
          items={[
            { label: "Boutique", href: "/boutique" },
            { label: category.name, href: `/boutique/${category.slug}` },
            { label: brand.name },
          ]}
        />
        <header className="space-y-1">
          <h1 className="text-3xl">{brand.name}</h1>
          <p className="text-ink-muted">
            Choisis ta série, de la plus récente à la plus ancienne.
          </p>
        </header>
        {series.length === 0 ? (
          <p className="card p-6">
            Aucun appareil de cette marque pour le moment.
          </p>
        ) : (
          // 2 affiches par ligne sur tablette, 3 seulement à partir de 1280 px : en
          // paysage (16/10), une affiche plus étroite n'a pas la hauteur de son texte.
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {series.map((one, index) => (
              <li key={one.slug}>
                <SeriesCard
                  series={one}
                  href={`/boutique/${category.slug}/${brand.slug}/${one.slug}`}
                  palette={palette}
                  priority={index === 0}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const result =
    category && brand
      ? await publicFetchPage<ProductCard>(
          `/products?category=${category.slug}&brand=${brand.slug}&sort=${isDevice ? "sortie" : "nouveautes"}&limit=50`,
        )
      : null;

  if (!category || !brand || !result) {
    return UNAVAILABLE;
  }

  return (
    <div className="container-page space-y-6 py-8">
      <Breadcrumb
        items={[
          { label: "Boutique", href: "/boutique" },
          { label: category.name, href: `/boutique/${category.slug}` },
          { label: brand.name },
        ]}
      />
      <header className="space-y-1">
        <h1 className="text-3xl">{brand.name}</h1>
        <p className="text-ink-muted">
          {isDevice
            ? "Tous les modèles, du plus récent au plus ancien."
            : `${result.pagination.total} produit${result.pagination.total > 1 ? "s" : ""}`}
        </p>
      </header>

      {isDevice ? (
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {result.data.map((product) => (
            <li key={product.id} className="flex">
              <ModelCard
                product={product}
                sizes="(min-width: 1024px) 280px, (min-width: 768px) 33vw, 50vw"
              />
            </li>
          ))}
        </ul>
      ) : (
        <ProductGrid products={result.data} />
      )}
    </div>
  );
}
