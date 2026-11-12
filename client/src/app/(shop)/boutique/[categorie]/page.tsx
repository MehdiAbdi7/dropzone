import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DevicePage from "@/features/categories/DevicePage";
import ShopBrowser from "@/features/categories/ShopBrowser";
import { DEVICE_KINDS } from "@/config/catalog";
import { publicFetch } from "@/lib/publicFetch";
import type { Category } from "@/types/api";

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

// Étapes 1 et 2 du parcours, sur une seule page : la barre des catégories, puis les marques de la
// catégorie (plus « Autres » pour les produits sans marque). Cette page lit l'API une fois ; tout
// ce qui change quand on clique sur une catégorie est dans ShopBrowser, qui n'a pas besoin de
// recharger la page.
export default async function ShopCategoryPage({
  params,
}: PageProps<"/boutique/[categorie]">) {
  const { categories, category } = await getCategory((await params).categorie);
  if (!categories) {
    return (
      <div className="container-page py-8">
        <p role="alert" className="card p-6">
          La boutique ne répond pas pour le moment. Rechargez la page dans
          quelques secondes.
        </p>
      </div>
    );
  }
  if (!category) {
    notFound();
  }

  // Une catégorie d'appareils : ses séries et les puces de marques (refonte du 12/11).
  if (DEVICE_KINDS.includes(category.kind)) {
    return <DevicePage category={category} />;
  }
  return <ShopBrowser categories={categories} initialSlug={category.slug} />;
}
