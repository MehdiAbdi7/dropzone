import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import ProductSearch from "@/features/products/ProductSearch";
import ProductGrid from "@/features/products/ProductGrid";
import { catalogRedirect } from "@/lib/legacyRedirect";
import { publicFetch, publicFetchPage } from "@/lib/publicFetch";
import type { Category, ProductCard } from "@/types/api";

export const metadata: Metadata = { title: "Rechercher un produit" };

const PARAMS = ["q", "model", "page"] as const;

export default async function CatalogPage({ searchParams }: PageProps<"/produits">) {
  const query = await searchParams;
  // La page de recherche garde les requêtes vides pour afficher son champ de recherche.
  const target = catalogRedirect(
    new URLSearchParams(Object.entries(query).flatMap(([key, value]) => (typeof value === "string" ? [[key, value]] : []))),
  );
  if (target) {
    redirect(target);
  }
  // On ne transmet à l'API que les paramètres connus, en texte simple.
  const params = new URLSearchParams();
  const selectedCategories = Array.isArray(query.category)
    ? query.category
    : typeof query.category === "string"
      ? [query.category]
      : [];
  for (const category of selectedCategories) {
    params.append("category", category);
  }
  for (const key of PARAMS) {
    const value = query[key];
    if (typeof value === "string" && value) {
      params.set(key, value);
    }
  }

  const search = params.get("q")?.trim() ?? "";
  const model = params.get("model");
  const [result, categories] = await Promise.all([
    search || model ? publicFetchPage<ProductCard>(`/products?${params.toString()}`) : Promise.resolve(null),
    publicFetch<Category[]>("/categories"),
  ]);
  const title = search
    ? `Résultats pour « ${search} »`
    : model
      ? "Accessoires compatibles"
      : "Rechercher un produit";

  // Les liens de pagination gardent les filtres et changent seulement la page.
  const pageHref = (page: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(page));
    return `/produits?${next.toString()}`;
  };

  return (
    <div className="container-page space-y-6 py-8">
      <ProductSearch categories={categories ?? []} />
      <header className="space-y-1">
        <h1 className="text-3xl">{title}</h1>
        {result ? (
          <p className="text-ink-muted">
            {result.pagination.total} produit{result.pagination.total > 1 ? "s" : ""}
          </p>
        ) : null}
      </header>

      {!search && !model ? (
        <div className="card p-6 text-center text-ink-muted">
          Commencez à saisir un nom de produit pour afficher les résultats.
        </div>
      ) : !result ? (
        <p role="alert" className="card p-6">
          Le catalogue ne répond pas pour le moment. Rechargez la page dans quelques secondes.
        </p>
      ) : result.data.length === 0 ? (
        <div className="card space-y-3 p-8 text-center">
          <p className="text-lg font-semibold">Aucun produit ne correspond.</p>
          <p className="text-ink-muted">Essayez un autre modèle, ou retirez un filtre.</p>
          <Link href="/boutique" className="btn btn-secondary">
            Aller à la Boutique
          </Link>
        </div>
      ) : (
        <>
          <ProductGrid products={result.data} />
          {result.pagination.pages > 1 ? (
            <nav aria-label="Pages" className="flex flex-wrap justify-center gap-2">
              {Array.from({ length: result.pagination.pages }, (_, index) => index + 1).map((page) => (
                <Link
                  key={page}
                  href={pageHref(page)}
                  aria-current={page === result.pagination.page ? "page" : undefined}
                  className={`btn btn-small ${page === result.pagination.page ? "btn-primary" : "btn-secondary"}`}
                >
                  {page}
                </Link>
              ))}
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
