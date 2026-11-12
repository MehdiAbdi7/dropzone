"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import BrandLogo from "@/components/ui/BrandLogo";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ProductImage from "@/components/ui/ProductImage";
import { useAdminProductsQuery, useDeleteProductMutation } from "@/features/admin/api/productsApi";
import { useBrandsQuery, useCatalogQuery, useMakersQuery } from "@/features/admin/api/catalogApi";
import MakersEditor from "@/features/admin/MakersEditor";
import Breadcrumb from "@/features/shop/Breadcrumb";
import { kindIcon } from "@/features/shop/colors";
import { errorMessage } from "@/lib/errors";
import { formatPrice } from "@/lib/format";

// Un type d'accessoires du Catalogue (06/11) : Catalogue › Accessoires › Coques. Ses produits
// rangés par marque (12/11 : Apple, Samsung, Anker…), avec leur photo, leur prix et leur stock,
// et tout ce qu'il faut pour les gérer : « Nouvel accessoire » (formulaire produit déjà rangé
// dans la catégorie, le type et la marque), « Modifier », « Supprimer », et en bas l'éditeur des
// marques du type. Un type est une ligne de `brands` d'une catégorie d'accessoires.
export default function CatalogAccessoryTypePage() {
  const id = Number(useParams<{ id: string }>().id);
  const { data: brands, isLoading: brandsLoading } = useBrandsQuery();
  const { data: categories } = useCatalogQuery();
  const { data: allMakers = [] } = useMakersQuery();
  // 50 au plus, la limite de l'API : bien assez pour un type d'accessoires.
  const { data: page, isLoading, error } = useAdminProductsQuery({ brand: id, limit: 50, page: 1 });
  const [remove, removeState] = useDeleteProductMutation();
  const [removedName, setRemovedName] = useState<string | null>(null);

  const type = brands?.find((brand) => brand.id === id);
  const category = categories?.find((item) => item.id === type?.categoryId);

  if (brandsLoading || isLoading) {
    return <p className="text-ink-muted">Chargement…</p>;
  }
  if (!type || error) {
    return <p className="field-error">{error ? errorMessage(error) : "Type introuvable"}</p>;
  }
  const products = page?.data ?? [];
  const makers = allMakers.filter((maker) => maker.typeId === id);
  const newHref = (makerId?: number) =>
    `/admin/produits/nouveau?categorie=${type.categoryId}&marque=${type.id}${makerId ? `&fabricant=${makerId}` : ""}`;

  // Les produits de chaque marque, dans l'ordre des tuiles de la Boutique ; puis ceux sans marque.
  const groups = [
    ...makers.map((maker) => ({
      key: String(maker.id),
      title: maker.name,
      logoUrl: maker.logoUrl,
      makerId: maker.id,
      items: products.filter((product) => product.maker?.id === maker.id),
    })),
    { key: "none", title: "Sans marque", logoUrl: null, makerId: undefined, items: products.filter((product) => !product.maker) },
  ].filter((group) => group.items.length > 0 || group.makerId !== undefined);

  return (
    <div className="max-w-5xl space-y-6">
      <Breadcrumb
        items={[
          { label: "Catalogue", href: "/admin/catalogue" },
          ...(category ? [{ label: category.name, href: `/admin/catalogue/${category.id}` }] : []),
          { label: type.name },
        ]}
      />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          {type.logoUrl ? (
            <span className="grid size-12 place-items-center rounded-full bg-surface-2">
              <BrandLogo url={type.logoUrl} size={26} />
            </span>
          ) : null}
          <div className="space-y-1">
            <h1 className="text-3xl">{type.name}</h1>
            <p className="text-ink-muted">
              {products.length} accessoire{products.length > 1 ? "s" : ""}. Photo, prix, stock, couleurs, marque et modèles
              compatibles se règlent dans la fiche.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {category ? (
            <Link href={`/admin/catalogue/${category.id}#marques`} className="btn btn-secondary btn-small">
              Renommer ou supprimer le type
            </Link>
          ) : null}
          <Link href={newHref()} className="btn btn-primary btn-small">
            + Nouvel accessoire
          </Link>
        </div>
      </div>

      {removedName ? (
        <p role="status" className="rounded-lg border border-line bg-surface-2 p-3 text-sm">
          « {removedName} » est supprimé.
        </p>
      ) : null}
      {removeState.error ? <p className="field-error">{errorMessage(removeState.error)}</p> : null}

      {products.length === 0 && makers.length === 0 ? (
        <div className="card space-y-3 p-6 text-center">
          <p className="font-semibold">Aucun accessoire dans ce type pour l&apos;instant.</p>
          <Link href={newHref()} className="btn btn-primary">
            Créer le premier
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`maker-${group.key}`} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id={`maker-${group.key}`} className="flex items-center gap-2 text-xl">
                  {group.logoUrl ? (
                    <span className="grid size-8 place-items-center rounded-full bg-surface-2">
                      <BrandLogo url={group.logoUrl} size={16} />
                    </span>
                  ) : null}
                  {group.title}{" "}
                  <span className="text-sm font-normal text-ink-muted">
                    {group.items.length} produit{group.items.length > 1 ? "s" : ""}
                  </span>
                </h2>
                <Link href={newHref(group.makerId)} className="btn btn-secondary btn-small">
                  + Nouvel accessoire {group.makerId ? `${group.title}` : ""}
                </Link>
              </div>
              {group.items.length === 0 ? (
                <p className="text-sm text-ink-muted">Aucun produit pour cette marque : elle n&apos;apparaît pas encore dans la Boutique.</p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((product) => (
                    <li key={product.id} className="card flex flex-col gap-3 p-3">
                      <div className="relative aspect-square overflow-hidden rounded-[10px] bg-surface-2">
                        <ProductImage src={product.image ?? kindIcon("accessory")} alt="" sizes="(min-width: 1024px) 300px, 45vw" />
                        {product.status === "draft" ? (
                          <span className="badge absolute left-2 top-2 bg-amber-soft text-ink">Brouillon</span>
                        ) : null}
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <p className="font-display font-bold">{product.name}</p>
                        <p className="text-sm text-ink-muted">
                          {product.variantCount > 1 ? "Dès " : ""}
                          {formatPrice(product.minPrice)} ·{" "}
                          {product.newStock > 0 ? `${product.newStock} en stock` : "Rupture de stock"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/admin/produits/${product.id}`} className="btn btn-secondary btn-small">
                          Modifier
                        </Link>
                        <ConfirmDialog
                          trigger="Supprimer"
                          title={`Supprimer « ${product.name} » ?`}
                          confirmLabel="Supprimer"
                          onConfirm={async () => {
                            try {
                              await remove(product.id).unwrap();
                              setRemovedName(product.name);
                            } catch {
                              // Affiché au-dessus de la liste.
                            }
                          }}
                        >
                          Le produit, ses photos et ses variantes disparaissent. Les commandes passées gardent leurs lignes.
                          S&apos;il était offert avec une affaire, il n&apos;y est plus offert.
                        </ConfirmDialog>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      <section id="marques" aria-labelledby="makers-title" className="card scroll-mt-6 space-y-3 p-5">
        <h2 id="makers-title" className="text-xl">
          Créer et modifier les marques
        </h2>
        <p className="text-sm text-ink-muted">
          La Boutique montre d&apos;abord les marques du type (Apple, Samsung, Anker…), puis les affiches de leurs produits. Une marque
          sans produit publié n&apos;apparaît pas.
        </p>
        <MakersEditor typeId={type.id} typeName={type.name} />
      </section>
    </div>
  );
}
