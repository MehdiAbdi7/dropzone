"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import BrandLogo from "@/components/ui/BrandLogo";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { DEVICE_KINDS, KIND_LABELS } from "@/config/catalog";
import BrandsEditor from "@/features/admin/BrandsEditor";
import {
  useCatalogCategoryQuery,
  useDeleteCategoryMutation,
  useUpdateCategoryMutation,
  type AdminCatalogCategoryPage,
} from "@/features/admin/adminApi";
import CatalogTile from "@/features/admin/catalog/CatalogTile";
import Breadcrumb from "@/features/shop/Breadcrumb";
import { errorMessage } from "@/lib/errors";

// Une catégorie du Catalogue : ses marques (avec leur stock) et, en dessous, l'éditeur
// des marques (nom, logo, ordre) et le renommage de la catégorie.
export default function CatalogCategoryPage() {
  const id = Number(useParams<{ id: string }>().id);
  const { data, isLoading, error } = useCatalogCategoryQuery(id);

  if (isLoading) {
    return <p className="text-ink-muted">Chargement…</p>;
  }
  if (error || !data) {
    return <p className="field-error">{error ? errorMessage(error) : "Catégorie introuvable"}</p>;
  }
  return <CategoryView data={data} />;
}

function CategoryView({ data }: { data: AdminCatalogCategoryPage }) {
  const { category, brands } = data;
  const isDevice = DEVICE_KINDS.includes(category.kind);
  const router = useRouter();
  const [update, updateState] = useUpdateCategoryMutation();
  const [remove, removeState] = useDeleteCategoryMutation();
  const [name, setName] = useState(category.name);
  const actionError = updateState.error ?? removeState.error;

  async function onDelete() {
    try {
      await remove(category.id).unwrap();
      router.push("/admin/catalogue");
    } catch {
      // Affiché sous les boutons (une catégorie utilisée est refusée).
    }
  }

  return (
    <div className="max-w-5xl space-y-6">
      <Breadcrumb items={[{ label: "Catalogue", href: "/admin/catalogue" }, { label: category.name }]} />
      <div className="space-y-1">
        <h1 className="text-3xl">{category.name}</h1>
        <p className="text-ink-muted">
          {KIND_LABELS[category.kind]}.{" "}
          {isDevice
            ? "Choisis une marque pour voir ses séries."
            : "Choisis un type pour voir, créer, modifier ou supprimer ses accessoires. Les types se créent en bas de la page."}
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {brands.map((brand) => (
          <li key={brand.id}>
            <CatalogTile
              // Accessoires (06/11) : la page du type, avec ses produits.
              href={isDevice ? `/admin/catalogue/marques/${brand.id}` : `/admin/catalogue/types/${brand.id}`}
              icon={<BrandLogo url={brand.logoUrl} size={28} />}
              title={brand.name}
              subtitle={
                isDevice
                  ? `${brand.seriesCount} série${brand.seriesCount > 1 ? "s" : ""} · ${brand.productCount} produit${brand.productCount > 1 ? "s" : ""}`
                  : `${brand.productCount} produit${brand.productCount > 1 ? "s" : ""}`
              }
              newStock={brand.newStock}
              dealCount={brand.dealCount}
            />
          </li>
        ))}
      </ul>

      <section id="marques" aria-labelledby="brands-title" className="card scroll-mt-6 space-y-3 p-5">
        <h2 id="brands-title" className="text-xl">
          {isDevice ? "Modifier les marques" : "Créer et modifier les types"}
        </h2>
        <BrandsEditor categoryId={category.id} isDevice={isDevice} />
      </section>

      <section aria-labelledby="category-title" className="card space-y-3 p-5">
        <h2 id="category-title" className="text-xl">
          La catégorie
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-48 flex-1 space-y-1">
            <span className="label">Nom</span>
            <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={name === category.name || name.trim().length < 2 || updateState.isLoading}
            onClick={() => update({ id: category.id, name })}
          >
            Renommer
          </button>
          <ConfirmDialog trigger="Supprimer" title={`Supprimer « ${category.name} » ?`} confirmLabel="Supprimer" onConfirm={onDelete}>
            Une catégorie qui a encore des produits ou des séries est refusée.
          </ConfirmDialog>
        </div>
        {actionError ? <p className="field-error">{errorMessage(actionError)}</p> : null}
      </section>
    </div>
  );
}
