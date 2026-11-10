"use client";

import Link from "next/link";
import { useState } from "react";
import ProductImage from "@/components/ui/ProductImage";
import { useAdminProductsQuery } from "@/features/admin/api/productsApi";
import { useBrandsQuery, useCategoriesQuery } from "@/features/admin/api/catalogApi";
import { formatPrice } from "@/lib/format";

const SORT_OPTIONS = [
  ["recent", "Plus récents"],
  ["name-asc", "Nom : A à Z"],
  ["name-desc", "Nom : Z à A"],
  ["price-asc", "Prix : croissant"],
  ["price-desc", "Prix : décroissant"],
] as const;

export default function AdminProductsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState<number | null>(null);
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number][0]>("recent");
  const [view, setView] = useState<"table" | "cards">("table");
  const [page, setPage] = useState(1);
  const { data, isFetching, error, refetch } = useAdminProductsQuery({
    q: q || undefined,
    status: status || undefined,
    category: category || undefined,
    brand: brand ?? undefined,
    sort,
    page,
  });
  const { data: categories, error: categoriesError } = useCategoriesQuery();
  const { data: brands, error: brandsError } = useBrandsQuery();
  const selectedCategory = categories?.find((item) => item.slug === category);
  const categoryBrands = brands?.filter((item) => item.categoryId === selectedCategory?.id) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Produits</h1>
        <Link href="/admin/produits/nouveau" className="btn btn-primary">
          Nouveau produit
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="min-w-60 flex-1">
          <span className="sr-only">Chercher un produit</span>
          <input
            className="input"
            type="search"
            placeholder="Nom, SKU ou référence…"
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          <span className="sr-only">Statut</span>
          <select
            className="input"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Tous les statuts</option>
            <option value="published">Publiés</option>
            <option value="draft">Brouillons</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Trier les produits</span>
          <select
            className="input"
            value={sort}
            onChange={(event) => {
              setSort(SORT_OPTIONS.find(([value]) => value === event.target.value)?.[0] ?? "recent");
              setPage(1);
            }}
          >
            {SORT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">Filtrer par catégorie</p>
        {categoriesError ? <p className="field-error">Impossible de charger les catégories.</p> : null}
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            className={`btn btn-small shrink-0 ${category ? "btn-outline" : "btn-primary"}`}
            aria-pressed={!category}
            onClick={() => {
              setCategory("");
              setBrand(null);
              setPage(1);
            }}
          >
            Toutes
          </button>
          {categories?.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`btn btn-small shrink-0 ${category === item.slug ? "btn-primary" : "btn-outline"}`}
              aria-pressed={category === item.slug}
              onClick={() => {
                setCategory(category === item.slug ? "" : item.slug);
                setBrand(null);
                setPage(1);
              }}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      {selectedCategory ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Filtrer par marque</p>
          {brandsError ? <p className="field-error">Impossible de charger les marques.</p> : null}
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <button
              type="button"
              className={`btn btn-small shrink-0 ${brand === null ? "btn-primary" : "btn-outline"}`}
              aria-pressed={brand === null}
              onClick={() => {
                setBrand(null);
                setPage(1);
              }}
            >
              Toutes les marques
            </button>
            {categoryBrands.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`btn btn-small shrink-0 ${brand === item.id ? "btn-primary" : "btn-outline"}`}
                aria-pressed={brand === item.id}
                onClick={() => {
                  setBrand((current) => (current === item.id ? null : item.id));
                  setPage(1);
                }}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm">
          <p>Impossible de charger les produits. Vérifiez la connexion puis réessayez.</p>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => refetch()}>
            Réessayer
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold">Affichage</p>
        <div className="flex gap-2" role="group" aria-label="Mode d’affichage des produits">
          <button
            type="button"
            className={`btn btn-small ${view === "table" ? "btn-primary" : "btn-outline"}`}
            aria-pressed={view === "table"}
            onClick={() => setView("table")}
          >
            Tableau
          </button>
          <button
            type="button"
            className={`btn btn-small ${view === "cards" ? "btn-primary" : "btn-outline"}`}
            aria-pressed={view === "cards"}
            onClick={() => setView("cards")}
          >
            Cartes
          </button>
        </div>
      </div>

      {view === "cards" ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy={isFetching}>
          {data?.data.map((product) => (
            <li key={product.id}>
              <Link
                href={`/admin/produits/${product.id}`}
                className="card flex min-w-0 items-center gap-3 p-3 transition hover:border-blue-ink/50"
              >
                <span className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  <ProductImage src={product.image} alt="" sizes="80px" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="mb-1 block truncate font-semibold">{product.name}</span>
                  <span className={`badge ${product.status === "published" ? "badge-refurb" : "badge-out"}`}>
                    {product.status === "published" ? "Publié" : "Brouillon"}
                  </span>
                  <span className="mt-1 block truncate text-xs text-ink-muted">{product.category.name}</span>
                  <span className="mt-1 block text-xs text-ink-muted">
                    {product.newStock} neuf{product.newStock > 1 ? "s" : ""} · {product.refurbishedAvailable} affaire
                    {product.refurbishedAvailable > 1 ? "s" : ""}
                  </span>
                  <span className="mt-1 block text-sm font-semibold">
                    {product.newPrice === null ? "Aucun neuf" : `Neuf : ${formatPrice(product.newPrice)}`}
                  </span>
                </span>
              </Link>
            </li>
          ))}
          {data && data.data.length === 0 ? <li className="card p-6 text-ink-muted">Aucun produit.</li> : null}
        </ul>
      ) : (
        <div className="card overflow-x-auto" aria-busy={isFetching}>
          <table className="table min-w-[720px]">
            <thead>
              <tr>
                <th scope="col">Produit</th>
                <th scope="col">Catégorie</th>
                <th scope="col">Statut</th>
                <th scope="col">Neufs en stock</th>
                <th scope="col">Affaires</th>
                <th scope="col">Prix neuf</th>
              </tr>
            </thead>
            <tbody>
              {data?.data.map((product) => (
                <tr key={product.id}>
                  <td>
                    <Link href={`/admin/produits/${product.id}`} className="flex items-center gap-3 font-semibold hover:text-blue-ink">
                      <span className="relative size-11 shrink-0 overflow-hidden rounded-md bg-surface-2">
                        <ProductImage src={product.image} alt="" sizes="44px" />
                      </span>
                      {product.name}
                    </Link>
                  </td>
                  <td>{product.category.name}</td>
                  <td>
                    <span className={`badge ${product.status === "published" ? "badge-refurb" : "badge-out"}`}>
                      {product.status === "published" ? "Publié" : "Brouillon"}
                    </span>
                  </td>
                  <td className={product.newStock === 0 ? "text-ink-muted" : ""}>{product.newStock}</td>
                  <td>{product.refurbishedAvailable}</td>
                  <td>{product.newPrice === null ? "—" : formatPrice(product.newPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && data.data.length === 0 ? <p className="p-6 text-ink-muted">Aucun produit.</p> : null}
        </div>
      )}

      {data && data.pagination.pages > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <button type="button" className="btn btn-secondary btn-small" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Précédente
          </button>
          <p className="text-sm">
            Page {data.pagination.page} sur {data.pagination.pages}
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-small"
            disabled={page >= data.pagination.pages}
            onClick={() => setPage(page + 1)}
          >
            Suivante
          </button>
        </div>
      ) : null}
    </div>
  );
}
