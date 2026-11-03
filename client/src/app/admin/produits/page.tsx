"use client";

import Link from "next/link";
import { useState } from "react";
import ProductImage from "@/components/ui/ProductImage";
import { useAdminProductsQuery } from "@/features/admin/adminApi";
import { formatPrice } from "@/lib/format";

export default function AdminProductsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { data, isFetching } = useAdminProductsQuery({ q: q || undefined, status: status || undefined, page });

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
            placeholder="Chercher par nom…"
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
      </div>

      <div className="card overflow-x-auto" aria-busy={isFetching}>
        <table className="table min-w-[720px]">
          <thead>
            <tr>
              <th scope="col">Produit</th>
              <th scope="col">Catégorie</th>
              <th scope="col">Statut</th>
              <th scope="col">Neufs en stock</th>
              <th scope="col">Affaires</th>
              <th scope="col">À partir de</th>
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
                <td>{formatPrice(product.minPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && data.data.length === 0 ? <p className="p-6 text-ink-muted">Aucun produit.</p> : null}
      </div>

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
