import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import CatalogFilters from "@/features/products/CatalogFilters";
import ProductGrid from "@/features/products/ProductGrid";
import { publicFetch, publicFetchPage } from "@/lib/publicFetch";
import type { Category, ProductCard } from "@/types/api";

export const metadata: Metadata = { title: "Produits" };

const PARAMS = ["category", "q", "condition", "model", "offre", "sort", "page"] as const;

export default async function CatalogPage({ searchParams }: PageProps<"/produits">) {
  const query = await searchParams;
  // On ne transmet à l'API que les paramètres connus, en texte simple.
  const params = new URLSearchParams();
  for (const key of PARAMS) {
    const value = query[key];
    if (typeof value === "string" && value) {
      params.set(key, value);
    }
  }

  const [result, categories] = await Promise.all([
    publicFetchPage<ProductCard>(`/products?${params.toString()}`, 60),
    publicFetch<Category[]>("/categories", 300),
  ]);

  const category = categories?.find((item) => item.slug === params.get("category"));
  const search = params.get("q");
  const title = search
    ? `Résultats pour « ${search} »`
    : params.get("offre") === "affaire"
      ? "Les affaires du moment"
      : params.get("condition") === "reconditionne"
        ? "Reconditionnés disponibles"
        : (category?.name ?? "Tous les produits");

  // Les liens de pagination gardent les filtres et changent seulement la page.
  const pageHref = (page: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(page));
    return `/produits?${next.toString()}`;
  };

  return (
    <div className="container-page space-y-6 py-8">
      <header className="space-y-1">
        <h1 className="text-3xl">{title}</h1>
        {result ? (
          <p className="text-ink-muted">
            {result.pagination.total} produit{result.pagination.total > 1 ? "s" : ""}
          </p>
        ) : null}
      </header>

      {/* useSearchParams demande une frontière Suspense. */}
      <Suspense>
        <CatalogFilters categories={categories ?? []} />
      </Suspense>

      {!result ? (
        <p role="alert" className="card p-6">
          Le catalogue ne répond pas pour le moment. Rechargez la page dans quelques secondes.
        </p>
      ) : result.data.length === 0 ? (
        <div className="card space-y-3 p-8 text-center">
          <p className="text-lg font-semibold">Aucun produit ne correspond.</p>
          <p className="text-ink-muted">Essayez un autre modèle, ou retirez un filtre.</p>
          <Link href="/produits" className="btn btn-secondary">
            Voir tout le catalogue
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
