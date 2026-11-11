"use client";

import ProductImage from "@/components/ui/ProductImage";
import {
  useBrandsQuery,
  useCategoriesQuery,
  useDeleteBrandPhotoMutation,
  useUploadBrandPhotoMutation,
  type AdminBrand,
} from "@/features/admin/api/catalogApi";
import { countLabel } from "@/features/categories/labels";
import { errorMessage } from "@/lib/errors";
import type { Category } from "@/types/api";

// La photo de chaque marque sur sa tuile de la Boutique (11/11) : une seule photo par marque,
// la même partout où la marque s'affiche. Sans photo, la tuile prend celle du produit publié le
// plus récent de la marque.
export default function BrandsSection() {
  const { data: brands, isLoading, error } = useBrandsQuery();
  const { data: categories } = useCategoriesQuery();

  if (isLoading) {
    return <p className="text-ink-muted">Chargement des marques…</p>;
  }
  if (error || !brands || !categories) {
    return <p className="field-error">{errorMessage(error)}</p>;
  }
  const groups = categories
    .map((category) => ({ category, brands: brands.filter((brand) => brand.categoryId === category.id) }))
    .filter((group) => group.brands.length > 0);

  return (
    <section aria-labelledby="brands-admin-title" className="space-y-6">
      <div className="space-y-1">
        <h2 id="brands-admin-title" className="text-2xl">
          Les marques
        </h2>
        <p className="text-ink-muted">
          Une photo sans fond (PNG ou WebP transparent) par marque, pour sa grande tuile dans la Boutique. Seules les
          plus demandées de chaque catégorie ont une grande tuile ; les autres n&apos;affichent que leur logo.
        </p>
      </div>
      {groups.map(({ category, brands: list }) => (
        <div key={category.id} className="space-y-3">
          <h3 className="text-lg">{category.name}</h3>
          <ul className="grid gap-3 md:grid-cols-2">
            {list.map((brand) => (
              <li key={brand.id}>
                <BrandPhotoRow brand={brand} category={category} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function BrandPhotoRow({ brand, category }: { brand: AdminBrand; category: Category }) {
  const [upload, uploadState] = useUploadBrandPhotoMutation();
  const [remove, removeState] = useDeleteBrandPhotoMutation();
  const busy = uploadState.isLoading || removeState.isLoading;
  const failure = uploadState.error ?? removeState.error;

  return (
    <div className="flex gap-3 rounded-xl border border-line bg-surface p-3 sm:gap-4">
      {/* Un damier sous la photo : on voit si le fond est bien transparent. */}
      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-[repeating-conic-gradient(var(--surface-2)_0_25%,var(--surface)_0_50%)] bg-[length:16px_16px] sm:size-[4.5rem]">
        {brand.photoUrl ? (
          <ProductImage src={brand.photoUrl} alt={`Photo de ${brand.name}`} sizes="72px" />
        ) : (
          <span className="flex h-full items-center justify-center text-center text-xs text-ink-muted">Aucune</span>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="truncate text-sm font-semibold">{brand.name}</p>
          <p className="text-xs text-ink-muted">
            {countLabel(category.kind, brand.productCount)}
            {brand.photoUrl ? "" : " · photo du dernier produit"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="btn btn-secondary btn-small cursor-pointer">
            {uploadState.isLoading ? "Envoi…" : brand.photoUrl ? "Changer" : "Ajouter une photo"}
            <input
              type="file"
              accept="image/png,image/webp"
              className="sr-only"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) {
                  upload({ id: brand.id, file });
                }
              }}
            />
          </label>
          {brand.photoUrl ? (
            <button type="button" className="btn btn-outline btn-small" disabled={busy} onClick={() => remove(brand.id)}>
              Retirer
            </button>
          ) : null}
        </div>
        {failure ? <p className="field-error">{errorMessage(failure)}</p> : null}
      </div>
    </div>
  );
}
