"use client";

import { useState } from "react";
import { useCategoriesQuery, useUpdateCategoryMutation } from "@/features/admin/api/catalogApi";
import EditDialog from "@/features/admin/products/EditDialog";
import SlotRow from "@/features/admin/SlotRow";
import StageEditor from "@/features/admin/StageEditor";
import { compositionDevices } from "@/features/categories/art";
import CategoryArt from "@/features/categories/CategoryArt";
import { countLabel } from "@/features/categories/labels";
import { errorMessage } from "@/lib/errors";
import type { Category } from "@/types/api";
import PersonalizationCard from "./PersonalizationCard";

// La composition de photos de chaque catégorie (11/11). C'est la même sur l'accueil, dans la
// Boutique et partout où la catégorie s'affiche : on la règle une seule fois, ici. Elle
// réutilise le socle de l'accueil : mêmes routes de l'API (le socle « category-<id> »), même
// éditeur à la souris, mêmes lignes d'envoi de photo.
// La page ne montre qu'une carte par catégorie ; un clic ouvre la fenêtre de ses réglages.
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

// L'état d'une catégorie en une ligne, sur sa carte.
function cardMeta(category: Category): string {
  const count = category.photos.length;
  if (count > 0) {
    return `${count} photo${count > 1 ? "s" : ""}`;
  }
  return category.fallbackImage ? "Photo du dernier produit" : "Dessin de départ";
}

export default function CategoriesSection() {
  const { data: categories, isLoading, error } = useCategoriesQuery();
  // La catégorie dont la fenêtre est ouverte. On garde son numéro, pas l'objet : après un
  // enregistrement, la fenêtre relit la catégorie à jour dans la liste.
  const [openId, setOpenId] = useState<number | null>(null);

  if (isLoading) {
    return <p className="text-ink-muted">Chargement des catégories…</p>;
  }
  if (error || !categories) {
    return <p className="field-error">{errorMessage(error)}</p>;
  }
  const opened = categories.find((category) => category.id === openId);

  return (
    <section aria-labelledby="categories-admin-title" className="space-y-4">
      <div className="space-y-1">
        <h2 id="categories-admin-title" className="text-2xl">
          Les catégories
        </h2>
        <p className="text-ink-muted">
          La composition de photos de chaque catégorie, la même sur l&apos;accueil et dans la Boutique. La catégorie mise
          en avant prend la grande tuile de l&apos;accueil.
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {categories.map((category) => (
          <li key={category.id}>
            <PersonalizationCard
              title={category.name}
              meta={cardMeta(category)}
              badge={category.featured ? "Mise en avant" : undefined}
              preview={<CategoryArt category={category} />}
              onOpen={() => setOpenId(category.id)}
            />
          </li>
        ))}
      </ul>
      <EditDialog open={Boolean(opened)} title={opened?.name ?? ""} onClose={() => setOpenId(null)}>
        {opened ? <CategoryEditor category={opened} /> : null}
      </EditDialog>
    </section>
  );
}

// Le contenu de la fenêtre d'une catégorie : la mise en avant, l'éditeur de la composition à
// gauche, les photos à droite.
function CategoryEditor({ category }: { category: Category }) {
  const stage = `category-${category.id}`;
  const [setFeatured, featuredState] = useUpdateCategoryMutation();
  const taken = category.photos.map((photo) => photo.slot);
  const free = firstFreeSlot(taken);
  const slots = [...taken, ...(free ? [free] : [])];
  const urls = Object.fromEntries(category.photos.map((photo) => [photo.slot, photo.url]));

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Jusqu&apos;à {MAX_PHOTOS} photos sans fond (PNG ou WebP transparent), que tu places comme sur le socle de
        l&apos;accueil : glisse-les, tire le rond bleu du coin (ou le curseur) pour changer leur taille.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface p-3">
        <p className="text-sm">
          {category.productCount > 0
            ? countLabel(category.kind, category.productCount)
            : "Aucun produit publié : la tuile est cachée de l'accueil."}
        </p>
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-3">
          {/* `key` : l'éditeur repart de ce que dit l'API quand les photos ou leurs places changent. */}
          <div className="rounded-2xl bg-surface-2 p-4">
            <StageEditor
              key={JSON.stringify(category.photos)}
              stage={stage}
              devices={compositionDevices(category.photos)}
              fixed={[]}
              decor={false}
              nameOf={photoLabel}
            />
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
      </div>
    </div>
  );
}
