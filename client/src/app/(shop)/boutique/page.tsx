import type { Metadata } from "next";
import { KIND_IMAGES } from "@/features/home/CategoryCards";
import Breadcrumb from "@/features/shop/Breadcrumb";
import ChoiceTile from "@/features/shop/ChoiceTile";
import { publicFetch } from "@/lib/publicFetch";
import type { Category } from "@/types/api";

export const metadata: Metadata = { title: "Boutique" };

// Étape 1 du parcours : les catégories. Une catégorie sans produit reste visible, barrée.
export default async function ShopPage() {
  const categories = await publicFetch<Category[]>("/categories");

  return (
    <div className="container-page space-y-6 py-8">
      <Breadcrumb items={[{ label: "Boutique" }]} />
      <header className="space-y-1">
        <h1 className="text-3xl">Que cherchez-vous ?</h1>
        <p className="text-ink-muted">
          Choisissez une catégorie, puis une marque et un modèle.
        </p>
      </header>

      {!categories ? (
        <p role="alert" className="card p-6">
          La boutique ne répond pas pour le moment. Rechargez la page dans
          quelques secondes.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {categories.map((category) => (
            <li key={category.slug} className="flex">
              <ChoiceTile
                href={`/boutique/${category.slug}`}
                label={category.name}
                image={KIND_IMAGES[category.kind]}
                disabled={category.productCount === 0}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
