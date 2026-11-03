import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEVICE_KINDS } from "@/config/catalog";
import ProductGrid from "@/features/products/ProductGrid";
import Breadcrumb from "@/features/shop/Breadcrumb";
import ModelCard from "@/features/shop/ModelCard";
import { publicFetch, publicFetchPage } from "@/lib/publicFetch";
import type { Category, ProductCard } from "@/types/api";

// La catégorie et la marque de l'adresse, si elles existent. « autres » = sans marque.
async function getBrand(categorySlug: string, brandSlug: string) {
  const categories = await publicFetch<Category[]>("/categories", 300);
  const category = categories?.find((item) => item.slug === categorySlug);
  const brand =
    brandSlug === "autres"
      ? category?.hasUnbranded
        ? { name: "Autres", slug: "autres" }
        : undefined
      : category?.brands.find((item) => item.slug === brandSlug);
  return { categories, category, brand };
}

export async function generateMetadata({ params }: PageProps<"/boutique/[categorie]/[marque]">): Promise<Metadata> {
  const { categorie, marque } = await params;
  const { category, brand } = await getBrand(categorie, marque);
  return { title: category && brand ? `${brand.name} · ${category.name}` : "Boutique" };
}

// Étape 3 du parcours : les modèles de la marque, du plus récent au plus ancien
// (appareils), ou ses produits (accessoires, audiovisuel).
export default async function ShopBrandPage({ params }: PageProps<"/boutique/[categorie]/[marque]">) {
  const { categorie, marque } = await params;
  const { categories, category, brand } = await getBrand(categorie, marque);
  if (categories && (!category || !brand)) {
    notFound();
  }

  const isDevice = category ? DEVICE_KINDS.includes(category.kind) : false;
  const result =
    category && brand
      ? await publicFetchPage<ProductCard>(
          `/products?category=${category.slug}&brand=${brand.slug}&sort=${isDevice ? "sortie" : "nouveautes"}&limit=50`,
          60,
        )
      : null;

  if (!category || !brand || !result) {
    return (
      <div className="container-page py-8">
        <p role="alert" className="card p-6">
          La boutique ne répond pas pour le moment. Rechargez la page dans quelques secondes.
        </p>
      </div>
    );
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
              <ModelCard product={product} sizes="(min-width: 1024px) 280px, (min-width: 768px) 33vw, 50vw" />
            </li>
          ))}
        </ul>
      ) : (
        <ProductGrid products={result.data} />
      )}
    </div>
  );
}
