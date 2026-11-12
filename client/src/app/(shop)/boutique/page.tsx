import type { Metadata } from "next";
import CategoryGrid from "@/features/categories/CategoryGrid";
import ShopSearch from "@/features/categories/ShopSearch";
import Breadcrumb from "@/features/shop/Breadcrumb";
import { publicFetch } from "@/lib/publicFetch";
import type { Category } from "@/types/api";

export const metadata: Metadata = { title: "Boutique" };

// `/boutique` : les catégories seules (refonte du 12/11, décision de Mehdi). Avant, la page
// redirigeait vers la catégorie la plus fournie ; maintenant on choisit d'abord la catégorie,
// puis la marque et la série sur la page de la catégorie.
export default async function ShopPage() {
  const categories = await publicFetch<Category[]>("/categories");

  return (
    <div className="container-page space-y-6 py-8">
      <Breadcrumb items={[{ label: "Boutique" }]} />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl">Boutique</h1>
          <p className="text-ink-muted">Choisis une catégorie.</p>
        </div>
        <ShopSearch />
      </header>
      {!categories ? (
        <p role="alert" className="card p-6">
          La boutique ne répond pas pour le moment. Rechargez la page dans quelques secondes.
        </p>
      ) : categories.length === 0 ? (
        <p className="card p-6">Aucun produit en vente pour le moment. Revenez bientôt.</p>
      ) : (
        <CategoryGrid categories={categories} />
      )}
    </div>
  );
}
