import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DEVICE_KINDS } from "@/config/catalog";
import Breadcrumb from "@/features/shop/Breadcrumb";
import ChoiceTile from "@/features/shop/ChoiceTile";
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

// Étape 2 du parcours : les marques de la catégorie, plus « Autres » pour les produits sans marque.
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

  const unit = DEVICE_KINDS.includes(category.kind) ? "modèle" : "produit";
  const count = (n: number) => `${n} ${unit}${n > 1 ? "s" : ""}`;

  return (
    <div className="container-page space-y-6 py-8">
      <Breadcrumb
        items={[
          { label: "Boutique", href: "/boutique" },
          { label: category.name },
        ]}
      />
      {/* Pas de « Tout voir » : la liste de tous les produits n'existe plus, on choisit une marque. */}
      <header className="space-y-1">
        <h1 className="text-3xl">{category.name}</h1>
        <p className="text-ink-muted">Choisissez une marque.</p>
      </header>

      <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-5">
        {category.brands.map((brand) => (
          <li key={brand.slug} className="flex">
            <ChoiceTile
              href={`/boutique/${category.slug}/${brand.slug}`}
              label={brand.name}
              logoUrl={brand.logoUrl}
              hint={count(brand.productCount)}
            />
          </li>
        ))}
        {category.hasUnbranded ? (
          <li className="flex">
            <ChoiceTile
              href={`/boutique/${category.slug}/autres`}
              label="Autres"
              hint="Sans marque"
            />
          </li>
        ) : null}
      </ul>
    </div>
  );
}
