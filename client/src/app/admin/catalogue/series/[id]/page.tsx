"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ProductImage from "@/components/ui/ProductImage";
import {
  useCatalogSeriesQuery,
  useCreateModelMutation,
  useDeleteSeriesMutation,
  useRenameSeriesMutation,
  useSetSeriesModelsMutation,
  useUploadSeriesCoverMutation,
  type AdminSeriesPage,
} from "@/features/admin/adminApi";
import SeriesModelRow from "@/features/admin/catalog/SeriesModelRow";
import { moveItem } from "@/features/admin/catalog/reorder";
import { usePalette } from "@/features/admin/usePalette";
import Breadcrumb from "@/features/shop/Breadcrumb";
import { glowColor } from "@/features/shop/series";
import { errorMessage } from "@/lib/errors";

// Écran 3 du Catalogue : une série. Son image, son nom, puis ses modèles dans l'ordre de
// l'affiche, avec leur lueur, leur stock et les raccourcis vers le formulaire produit.
export default function CatalogSeriesPage() {
  const id = Number(useParams<{ id: string }>().id);
  const { data, isLoading, error } = useCatalogSeriesQuery(id);

  if (isLoading) {
    return <p className="text-ink-muted">Chargement…</p>;
  }
  if (error || !data) {
    return <p className="field-error">{error ? errorMessage(error) : "Série introuvable"}</p>;
  }
  return <SeriesView data={data} />;
}

function SeriesView({ data }: { data: AdminSeriesPage }) {
  const { series, models, candidates } = data;
  const router = useRouter();
  const [setModels, setState] = useSetSeriesModelsMutation();
  const [rename, renameState] = useRenameSeriesMutation();
  const [upload, uploadState] = useUploadSeriesCoverMutation();
  const [remove, removeState] = useDeleteSeriesMutation();
  const [name, setName] = useState(series.name);
  const dragged = useRef<number | null>(null);
  const palette = usePalette();
  const ids = models.map((model) => model.id);
  const shopHref = `/boutique/${series.category.slug}/${series.brand.slug}/${series.slug}`;
  const cover = models.find((model) => model.product?.image);
  const newStock = models.reduce((total, model) => total + (model.product?.newStock ?? 0), 0);
  const dealCount = models.reduce((total, model) => total + (model.product?.dealCount ?? 0), 0);
  const error = setState.error ?? renameState.error ?? uploadState.error ?? removeState.error;

  const save = (modelIds: number[]) => setModels({ id: series.id, modelIds });
  const move = (from: number, to: number) => {
    const next = moveItem(ids, from, to);
    if (next !== ids) {
      save(next);
    }
  };

  async function onDelete() {
    try {
      await remove(series.id).unwrap();
      router.push(`/admin/catalogue/marques/${series.brand.id}`);
    } catch {
      // Affiché sous l'en-tête.
    }
  }

  return (
    <div className="max-w-5xl space-y-6">
      <Breadcrumb
        items={[
          { label: "Catalogue", href: "/admin/catalogue" },
          { label: series.category.name, href: `/admin/catalogue/${series.category.id}` },
          { label: series.brand.name, href: `/admin/catalogue/marques/${series.brand.id}` },
          { label: series.name },
        ]}
      />

      <section aria-labelledby="series-title" className="card overflow-hidden p-3 sm:p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-xl bg-black sm:h-24 sm:w-40">
            {series.coverUrl ? (
              <Image src={series.coverUrl} alt="" fill sizes="160px" className="object-cover" />
            ) : (
              <div
                className="absolute inset-0"
                style={{ background: `radial-gradient(closest-side, ${glowColor(models[0]?.posterColor ?? null, palette)}, transparent), #07080c` }}
              >
                <ProductImage src={cover?.product?.image ?? null} alt="" sizes="160px" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink-muted">{series.category.name} / {series.brand.name}</p>
                <h1 id="series-title" className="mt-1 truncate text-2xl sm:text-3xl">{series.name}</h1>
              </div>
              <a href={shopHref} target="_blank" rel="noreferrer" className="btn btn-primary btn-small min-h-10 shrink-0 justify-center">
                Voir la boutique ↗
              </a>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-surface-2 px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">Modèles</p>
                <p className="mt-0.5 text-sm font-bold">{models.length}</p>
              </div>
              <div className="rounded-lg bg-blue-soft/40 px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-ink">Neufs</p>
                <p className="mt-0.5 text-sm font-bold text-blue-ink">{newStock} en stock</p>
              </div>
              <div className="rounded-lg bg-red-soft/40 px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-red">Affaires</p>
                <p className="mt-0.5 text-sm font-bold text-red">{dealCount} disponible{dealCount === 1 ? "" : "s"}</p>
              </div>
            </div>
          </div>
        </div>
        <details className="mt-4 border-t border-line pt-3">
          <summary className="cursor-pointer text-sm font-semibold text-ink-muted">Paramètres de la série</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <label className="btn btn-secondary btn-small min-h-10 w-full cursor-pointer justify-center sm:w-auto">
                {uploadState.isLoading ? "Envoi de l’image…" : "Changer la couverture"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) upload({ id: series.id, file });
                  }}
                />
              </label>
              <form
                className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
                onSubmit={(event) => {
                  event.preventDefault();
                  rename({ id: series.id, name });
                }}
              >
                <label className="min-w-0">
                  <span className="label">Nom de la série</span>
                  <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
                </label>
                <button type="submit" className="btn btn-secondary min-h-10" disabled={name.trim() === "" || name === series.name}>
                  Renommer
                </button>
              </form>
            </div>
            <div className="flex items-end sm:justify-end">
              <ConfirmDialog
                trigger="Supprimer la série"
                triggerClassName="btn btn-danger min-h-10 w-full justify-center sm:w-auto"
                title={`Supprimer « ${series.name} » ?`}
                confirmLabel="Supprimer"
                onConfirm={onDelete}
              >
                {models.length === 0
                  ? "Elle n'a aucun modèle."
                  : models.length === 1
                    ? "Son modèle redeviendra sans série."
                    : `Ses ${models.length} modèles redeviendront sans série.`}
              </ConfirmDialog>
            </div>
          </div>
        </details>
        {error ? <p className="field-error w-full">{errorMessage(error)}</p> : null}
      </section>

      <section aria-labelledby="models-title" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="models-title" className="text-xl">Modèles de la série</h2>
            <p className="mt-1 text-sm text-ink-muted">Réorganise l&apos;affiche avec les flèches ou en faisant glisser une carte.</p>
          </div>
          <span className="badge bg-surface-2 text-ink">{models.length} modèle{models.length === 1 ? "" : "s"}</span>
        </div>
        <ol className="space-y-3">
          {models.map((model, index) => (
            <SeriesModelRow
              key={model.id}
              model={model}
              index={index}
              count={models.length}
              newProductHref={`/admin/produits/nouveau?modele=${model.id}&categorie=${series.category.id}&marque=${series.brand.id}&nom=${encodeURIComponent(model.name)}`}
              onMove={move}
              onRemove={() => save(ids.filter((modelId) => modelId !== model.id))}
              onDragStart={() => {
                dragged.current = index;
              }}
              onDrop={() => {
                if (dragged.current !== null) {
                  move(dragged.current, index);
                  dragged.current = null;
                }
              }}
            />
          ))}
        </ol>
        <AddModel data={data} onAdd={(modelId) => save([...ids, modelId])} candidates={candidates} />
      </section>
    </div>
  );
}

// « + Ajouter un modèle à la série » : un modèle existant sans série, du même fabricant,
// ou un nouveau modèle créé ici puis rangé en fin de série.
function AddModel({
  data,
  candidates,
  onAdd,
}: {
  data: AdminSeriesPage;
  candidates: AdminSeriesPage["candidates"];
  onAdd: (modelId: number) => void;
}) {
  const { series } = data;
  const [createModel, createState] = useCreateModelMutation();
  const [picked, setPicked] = useState("");
  const [name, setName] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const maker = series.brand.makerName;

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    if (!maker) {
      return;
    }
    try {
      const created = await createModel({ brand: maker, name, kind: series.category.kind, releaseYear: Number(year) }).unwrap();
      onAdd(created.id);
      setName("");
    } catch {
      // Affiché sous le formulaire.
    }
  }

  return (
    <section aria-labelledby="add-model-title" className="space-y-3">
      <div>
        <h3 id="add-model-title" className="text-lg font-bold">Ajouter à la série</h3>
        <p className="mt-1 text-sm text-ink-muted">Choisis un modèle existant ou crée une nouvelle référence.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {candidates.length > 0 ? (
          <div className="card space-y-3 p-4">
            <div>
              <p className="font-semibold">Modèle existant</p>
              <p className="text-xs text-ink-muted">Ranger un modèle déjà connu dans cette série.</p>
            </div>
            <label>
              <span className="sr-only">Choisir un modèle existant</span>
              <select className="input" value={picked} onChange={(event) => setPicked(event.target.value)}>
                <option value="">Choisir un modèle…</option>
                {candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}{candidate.releaseYear ? ` (${candidate.releaseYear})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn btn-secondary min-h-10 w-full justify-center"
              disabled={!picked}
              onClick={() => {
                onAdd(Number(picked));
                setPicked("");
              }}
            >
              Ajouter le modèle
            </button>
          </div>
        ) : null}
        {maker ? (
          <form onSubmit={onCreate} className="card space-y-3 p-4">
            <div>
              <p className="font-semibold">Nouveau modèle</p>
              <p className="text-xs text-ink-muted">Marque : {maker}</p>
            </div>
            <label>
              <span className="label">Nom du modèle</span>
              <input className="input" placeholder="iPhone 19 Pro" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <div className="flex items-end gap-2">
              <label className="min-w-0 flex-1">
                <span className="label">Année de sortie</span>
                <input className="input" inputMode="numeric" value={year} onChange={(event) => setYear(event.target.value)} />
              </label>
              <button
                type="submit"
                className="btn btn-primary min-h-10 shrink-0"
                disabled={createState.isLoading || name.trim() === "" || !/^\d{4}$/.test(year)}
              >
                {createState.isLoading ? "Création…" : "Créer et ajouter"}
              </button>
            </div>
            {createState.error ? <p className="field-error">{errorMessage(createState.error)}</p> : null}
          </form>
        ) : (
          <p className="card self-stretch p-4 text-sm text-ink-muted">
            Cette marque n&apos;a pas de fabricant renseigné. Ajoute-le dans « Modifier la marque » pour créer un modèle ici.
          </p>
        )}
      </div>
    </section>
  );
}
