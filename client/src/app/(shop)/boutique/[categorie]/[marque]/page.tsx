import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEVICE_KINDS } from "@/config/catalog";
import MakerGrid from "@/features/categories/MakerGrid";
import ProductGrid from "@/features/products/ProductGrid";
import Breadcrumb from "@/features/shop/Breadcrumb";
import ModelCard from "@/features/shop/ModelCard";
import DevicePage from "@/features/categories/DevicePage";
import { publicFetch, publicFetchPage } from "@/lib/publicFetch";
import type { Category, ProductCard } from "@/types/api";

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
  // Une catégorie d'appareils (refonte du 12/11) : la même page que /boutique/<catégorie>, avec
  // la marque de l'adresse choisie (ou « Autres »). Les puces passent d'une marque à l'autre.
  if (category && isDevice) {
    return <DevicePage category={category} />;
  }

  // Un type d'accessoires qui a des marques (12/11) : l'étape marque, puis les affiches de la marque.
  // Un type sans marque garde la grille de ses produits, plus bas.
  const type = category?.brands.find((item) => item.slug === marque);
  if (category && type && !isDevice && (type.makers?.length ?? 0) > 0) {
    return (
      <div className="container-page space-y-6 py-8">
        <Breadcrumb
          items={[
            { label: "Boutique", href: "/boutique" },
            { label: category.name, href: `/boutique/${category.slug}` },
            { label: type.name },
          ]}
        />
        <header className="space-y-1">
          <h1 className="text-3xl">{type.name}</h1>
          <p className="text-ink-muted">Choisis une marque.</p>
        </header>
        <MakerGrid
          categorySlug={category.slug}
          typeSlug={type.slug}
          makers={type.makers ?? []}
          withoutMaker={type.withoutMaker ?? 0}
        />
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
