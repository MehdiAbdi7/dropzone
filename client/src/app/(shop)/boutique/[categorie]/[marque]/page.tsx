import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DEVICE_KINDS } from "@/config/catalog";
import DevicePage from "@/features/categories/DevicePage";
import { accessoryRedirect } from "@/lib/legacyRedirect";
import { publicFetch } from "@/lib/publicFetch";
import type { Category } from "@/types/api";

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

// `/boutique/<catégorie>/<marque>` (refonte du 12/11). Une catégorie d'appareils : la même page que
// la catégorie, la marque de l'adresse choisie (ou « Autres ») ; les puces passent d'une marque à
// l'autre sans recharger. Une catégorie d'accessoires n'a plus de page par type : l'ancienne
// adresse (`/boutique/accessoires/chargeurs`) mène à la page des accessoires, filtrée sur le type.
export default async function ShopBrandPage({
  params,
}: PageProps<"/boutique/[categorie]/[marque]">) {
  const { categorie, marque } = await params;
  const { categories, category, brand } = await getBrand(categorie, marque);
  if (!categories) {
    return (
      <div className="container-page py-8">
        <p role="alert" className="card p-6">
          La boutique ne répond pas pour le moment. Rechargez la page dans quelques secondes.
        </p>
      </div>
    );
  }
  if (!category) {
    notFound();
  }
  // Une marque d'appareils inconnue ou sans produit en vente (un lien partagé avant qu'elle ne
  // s'épuise) ouvre la première marque de la catégorie, plutôt qu'une page introuvable.
  if (DEVICE_KINDS.includes(category.kind)) {
    return <DevicePage category={category} />;
  }
  if (!brand) {
    notFound();
  }
  redirect(accessoryRedirect(category.slug, brand.slug));
}
