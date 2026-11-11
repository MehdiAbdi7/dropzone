import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SearchIcon } from "@/components/ui/icons";
import { DEVICE_KINDS } from "@/config/catalog";
import BrandTiles from "@/features/categories/BrandTiles";
import CategoryRail from "@/features/categories/CategoryRail";
import Breadcrumb from "@/features/shop/Breadcrumb";
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

// Étape 1 et 2 du parcours, sur une seule page (11/11) : la barre des catégories, puis les marques
// de la catégorie (plus « Autres » pour les produits sans marque). Un champ de recherche en haut :
// avec 127 PC portables, beaucoup de clients connaissent déjà le modèle.
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

  const isDevice = DEVICE_KINDS.includes(category.kind);

  return (
    <div className="container-page space-y-6 py-8">
      <Breadcrumb
        items={[
          { label: "Boutique", href: "/boutique" },
          { label: category.name },
        ]}
      />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl">{category.name}</h1>
          {/* Les accessoires se rangent par type (Coques, Chargeurs…, 06/11), les appareils par marque. */}
          <p className="text-ink-muted">{isDevice ? "Choisissez une marque." : "Choisissez un type."}</p>
        </div>
        {/* Une simple form GET : chercher marche même sans JavaScript. */}
        <form action="/produits" role="search" className="relative w-full sm:w-80">
          <label htmlFor="shop-search" className="sr-only">
            Quel modèle cherchez-vous ?
          </label>
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            id="shop-search"
            name="q"
            type="search"
            className="input w-full ps-10"
            placeholder="Chercher un modèle…"
          />
          <input type="hidden" name="category" value={category.slug} />
        </form>
      </header>

      <CategoryRail categories={categories} currentSlug={category.slug} />

      {category.productCount === 0 ? (
        <p className="card p-6">Aucun produit dans cette catégorie pour le moment.</p>
      ) : (
        <BrandTiles category={category} />
      )}
    </div>
  );
}
