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
  const ids = models.map((model) => model.id);
  const shopHref = `/boutique/${series.category.slug}/${series.brand.slug}/${series.slug}`;
  const cover = models.find((model) => model.product?.image);
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

      <section aria-labelledby="series-title" className="card flex flex-wrap items-center gap-4 p-4">
        <div className="relative h-28 w-44 shrink-0 overflow-hidden rounded-lg bg-black">
          {series.coverUrl ? (
            <Image src={series.coverUrl} alt="" fill sizes="176px" className="object-cover" />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: `radial-gradient(closest-side, ${glowColor(models[0]?.posterColor ?? null)}, transparent), #07080c` }}
            >
              <ProductImage src={cover?.product?.image ?? null} alt="" sizes="176px" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <h1 id="series-title" className="text-2xl">
            {series.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <label className="btn btn-secondary btn-small cursor-pointer">
              {uploadState.isLoading ? "Envoi…" : "Changer l'image"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    upload({ id: series.id, file });
                  }
                }}
              />
            </label>
            <a href={shopHref} target="_blank" rel="noreferrer" className="btn btn-outline btn-small">
              Voir l&apos;affiche dans la boutique ↗
            </a>
            <ConfirmDialog
              trigger="Supprimer la série"
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
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              rename({ id: series.id, name });
            }}
          >
            <label className="space-y-1">
              <span className="label">Nom de la série</span>
              <input className="input min-h-9 py-1" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <button type="submit" className="btn btn-secondary btn-small" disabled={name.trim() === "" || name === series.name}>
              Renommer
            </button>
          </form>
        </div>
        {error ? <p className="field-error w-full">{errorMessage(error)}</p> : null}
      </section>

      <section aria-labelledby="models-title" className="space-y-3">
        <h2 id="models-title" className="text-xl">
          Les modèles de l&apos;affiche
        </h2>
        <p className="text-sm text-ink-muted">
          Dans l&apos;ordre de l&apos;affiche : glisse ⋮⋮ ou utilise les flèches. La lueur : la couleur de la photo du modèle.
        </p>
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
    <div className="space-y-4 rounded-xl border-2 border-dashed border-line p-4">
      <h3 className="text-lg">+ Ajouter un modèle à la série</h3>
      {candidates.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1">
            <span className="label">Un modèle déjà connu</span>
            <select className="input min-h-9 py-1" value={picked} onChange={(event) => setPicked(event.target.value)}>
              <option value="">Choisir…</option>
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                  {candidate.releaseYear ? ` (${candidate.releaseYear})` : ""}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn btn-secondary btn-small"
            disabled={!picked}
            onClick={() => {
              onAdd(Number(picked));
              setPicked("");
            }}
          >
            Ajouter
          </button>
        </div>
      ) : null}
      {maker ? (
        <form onSubmit={onCreate} className="flex flex-wrap items-end gap-2">
          <label className="space-y-1">
            <span className="label">Ou un nouveau modèle ({maker})</span>
            <input className="input min-h-9 py-1" placeholder="iPhone 19 Pro" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="label">Année</span>
            <input className="input min-h-9 w-24 py-1" inputMode="numeric" value={year} onChange={(event) => setYear(event.target.value)} />
          </label>
          <button
            type="submit"
            className="btn btn-primary btn-small"
            disabled={createState.isLoading || name.trim() === "" || !/^\d{4}$/.test(year)}
          >
            Créer et ranger
          </button>
          {createState.error ? <p className="field-error w-full">{errorMessage(createState.error)}</p> : null}
        </form>
      ) : (
        <p className="text-sm text-ink-muted">
          Cette marque n&apos;a pas de fabricant renseigné : ajoute-le dans « Modifier la marque » pour créer un modèle ici.
        </p>
      )}
    </div>
  );
}
