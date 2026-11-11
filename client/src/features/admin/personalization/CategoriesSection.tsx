"use client";

import { useCategoriesQuery, useUpdateCategoryMutation } from "@/features/admin/api/catalogApi";
import SlotRow from "@/features/admin/SlotRow";
import StageEditor from "@/features/admin/StageEditor";
import { compositionDevices } from "@/features/categories/art";
import { countLabel } from "@/features/categories/labels";
import { errorMessage } from "@/lib/errors";
import type { Category } from "@/types/api";

// La composition de photos de chaque catégorie (11/11). C'est la même sur l'accueil, dans la
// Boutique et partout où la catégorie s'affiche : on la règle une seule fois, ici. Elle
// réutilise le socle de l'accueil : mêmes routes de l'API (le socle « category-<id> »), même
// éditeur à la souris, mêmes lignes d'envoi de photo.
const MAX_PHOTOS = 6;

// Le premier emplacement libre (« extra-2 » si extra-1 et extra-3 sont pris), ou null s'il n'y
// en a plus : six photos au plus par catégorie.
function firstFreeSlot(taken: string[]): string | null {
  for (let n = 1; n <= MAX_PHOTOS; n++) {
    if (!taken.includes(`extra-${n}`)) {
      return `extra-${n}`;
    }
  }
  return null;
}

const photoLabel = (slot: string) => `Photo ${slot.slice("extra-".length)}`;

export default function CategoriesSection() {
  const { data: categories, isLoading, error } = useCategoriesQuery();

  if (isLoading) {
    return <p className="text-ink-muted">Chargement des catégories…</p>;
  }
  if (error || !categories) {
    return <p className="field-error">{errorMessage(error)}</p>;
  }

  return (
    <section aria-labelledby="categories-admin-title" className="space-y-6">
      <div className="space-y-1">
        <h2 id="categories-admin-title" className="text-2xl">
          Les catégories
        </h2>
        <p className="text-ink-muted">
          La composition de photos de chaque catégorie, la même sur l&apos;accueil et dans la Boutique : jusqu&apos;à{" "}
          {MAX_PHOTOS} photos sans fond (PNG ou WebP transparent), que tu places comme sur le socle. Sans photo, la
          catégorie prend celle de son produit le plus récent. La catégorie mise en avant prend la grande tuile de
          l&apos;accueil ; sans choix de ta part, c&apos;est la plus fournie.
        </p>
      </div>
      <ul className="space-y-6">
        {categories.map((category) => (
          <li key={category.id}>
            <CategoryCard category={category} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function CategoryCard({ category }: { category: Category }) {
  const stage = `category-${category.id}`;
  const [setFeatured, featuredState] = useUpdateCategoryMutation();
  const taken = category.photos.map((photo) => photo.slot);
  const free = firstFreeSlot(taken);
  const slots = [...taken, ...(free ? [free] : [])];
  const urls = Object.fromEntries(category.photos.map((photo) => [photo.slot, photo.url]));

  return (
    <article aria-labelledby={`${stage}-title`} className="card grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 id={`${stage}-title`} className="text-xl">
              {category.name}
            </h3>
            <p className="text-sm text-ink-muted">
              {category.productCount > 0 ? countLabel(category.kind, category.productCount) : "Aucun produit publié : la tuile est cachée de l'accueil."}
            </p>
          </div>
          {category.featured ? (
            <span className="rounded-full bg-blue-soft px-3 py-1 text-xs font-bold text-blue-ink">Mise en avant sur l&apos;accueil</span>
          ) : (
            <button
              type="button"
              className="btn btn-outline btn-small"
              disabled={category.productCount === 0 || featuredState.isLoading}
              onClick={() => setFeatured({ id: category.id, featured: true })}
            >
              {featuredState.isLoading ? "Enregistrement…" : "Mettre en avant sur l'accueil"}
            </button>
          )}
        </div>
        {featuredState.error ? <p className="field-error">{errorMessage(featuredState.error)}</p> : null}
        {/* `key` : l'éditeur repart de ce que dit l'API quand les photos ou leurs places changent. */}
        <div className="rounded-2xl bg-surface-2 p-4">
          <StageEditor key={JSON.stringify(category.photos)} stage={stage} devices={compositionDevices(category.photos)} fixed={[]} decor={false} nameOf={photoLabel} />
        </div>
        {category.photos.length === 0 ? (
          <p className="text-sm text-ink-muted">
            {category.fallbackImage
              ? "Sans photo, la tuile prend la photo du produit publié le plus récent."
              : "Sans photo ni produit avec une image, la tuile affiche un dessin."}
          </p>
        ) : null}
      </div>
      <ul className="grid content-start gap-3">
        {slots.map((slot) => (
          <li key={slot}>
            <SlotRow stage={stage} slot={slot} label={photoLabel(slot)} url={urls[slot] ?? null} canRename={false} />
          </li>
        ))}
      </ul>
    </article>
  );
}
