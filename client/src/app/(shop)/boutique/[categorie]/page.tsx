import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DEVICE_KINDS } from "@/config/catalog";
import AccessoryBrowser from "@/features/accessories/AccessoryBrowser";
import DevicePage from "@/features/categories/DevicePage";
import { publicFetch } from "@/lib/publicFetch";
import type { AccessoryCatalog, Category } from "@/types/api";

// Le même appel sert à generateMetadata et à la page : Next le déduplique.
async function getCategory(slug: string) {
  const categories = await publicFetch<Category[]>("/categories");
  return {
    categories,
    category: categories?.find((item) => item.slug === slug),
  };
}

export async function generateMetadata({
  params,
}: PageProps<"/boutique/[categorie]">): Promise<Metadata> {
  const { category } = await getCategory((await params).categorie);
  return { title: category?.name ?? "Boutique" };
}

const UNAVAILABLE = (
  <div className="container-page py-8">
    <p role="alert" className="card p-6">
      La boutique ne répond pas pour le moment. Rechargez la page dans quelques secondes.
    </p>
  </div>
);

// La page d'une catégorie (refonte du 12/11) : elle se choisit par la sorte de la catégorie, jamais
// par son adresse. Une catégorie d'appareils : ses séries et les puces de marques. Une catégorie
// d'accessoires : une page, deux filtres (type, marque) et une fenêtre d'achat.
export default async function ShopCategoryPage({
  params,
}: PageProps<"/boutique/[categorie]">) {
  const { categories, category } = await getCategory((await params).categorie);
  if (!categories) {
    return UNAVAILABLE;
  }
  if (!category) {
    notFound();
  }

  if (DEVICE_KINDS.includes(category.kind)) {
    return <DevicePage category={category} />;
  }
  const catalog = await publicFetch<AccessoryCatalog>(`/accessories/${category.slug}`);
  if (!catalog) {
    return UNAVAILABLE;
  }
  // Suspense : les filtres se lisent dans l'adresse (useSearchParams), côté navigateur.
  return (
    <Suspense>
      <AccessoryBrowser catalog={catalog} />
    </Suspense>
  );
}
