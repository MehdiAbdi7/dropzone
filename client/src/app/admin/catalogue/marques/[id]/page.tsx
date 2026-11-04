"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  useCatalogBrandQuery,
  useCreateSeriesMutation,
  useSetSeriesModelsMutation,
  type AdminCatalogBrandPage,
} from "@/features/admin/adminApi";
import { AddTile } from "@/features/admin/catalog/CatalogTile";
import SeriesTile from "@/features/admin/catalog/SeriesTile";
import Breadcrumb from "@/features/shop/Breadcrumb";
import { errorMessage } from "@/lib/errors";

// Écran 2 du Catalogue : les séries d'une marque en affiches, comme dans la Boutique,
// et l'alerte des modèles en vente rangés dans aucune série (invisibles dans la Boutique).
export default function CatalogBrandPage() {
  const id = Number(useParams<{ id: string }>().id);
  const { data, isLoading, error } = useCatalogBrandQuery(id);

  if (isLoading) {
    return <p className="text-ink-muted">Chargement…</p>;
  }
  if (error || !data) {
    return <p className="field-error">{error ? errorMessage(error) : "Marque introuvable"}</p>;
  }
  return <BrandView data={data} />;
}

function BrandView({ data }: { data: AdminCatalogBrandPage }) {
  const { brand, series, unassigned } = data;
  const router = useRouter();
  const [create, createState] = useCreateSeriesMutation();
  const [name, setName] = useState("");

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    try {
      const created = await create({ brandId: brand.id, name }).unwrap();
      router.push(`/admin/catalogue/series/${created.id}`);
    } catch {
      // Affiché sous le champ.
    }
  }

  return (
    <div className="max-w-6xl space-y-6">
      <Breadcrumb
        items={[
          { label: "Catalogue", href: "/admin/catalogue" },
          { label: brand.category.name, href: `/admin/catalogue/${brand.category.id}` },
          { label: brand.name },
        ]}
      />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl">{brand.name}</h1>
          <p className="text-ink-muted">Les séries, de la plus récente à la plus ancienne, comme dans la Boutique.</p>
        </div>
        <Link href={`/admin/catalogue/${brand.category.id}#marques`} className="btn btn-secondary btn-small">
          Modifier la marque
        </Link>
      </div>

      {unassigned.length > 0 ? <UnassignedAlert data={data} /> : null}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {series.map((one) => (
          <li key={one.id}>
            <SeriesTile series={one} />
          </li>
        ))}
        <li>
          <AddTile>
            <form onSubmit={onCreate} className="space-y-3">
              <label htmlFor="series-name" className="label">
                + Nouvelle série
              </label>
              <input
                id="series-name"
                className="input"
                placeholder="iPhone 19"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <button type="submit" className="btn btn-primary btn-small" disabled={createState.isLoading || name.trim().length < 1}>
                Créer la série
              </button>
              {createState.error ? <p className="field-error">{errorMessage(createState.error)}</p> : null}
            </form>
          </AddTile>
        </li>
      </ul>
    </div>
  );
}

// L'alerte jaune : un modèle en vente sans série n'apparaît pas dans la Boutique.
// « Ranger » l'ajoute à la fin de la série choisie.
function UnassignedAlert({ data }: { data: AdminCatalogBrandPage }) {
  const { series, unassigned } = data;
  const [setModels, state] = useSetSeriesModelsMutation();
  const [choice, setChoice] = useState<Record<number, number>>({});

  return (
    <section role="alert" className="space-y-3 rounded-xl border border-amber/40 bg-amber-soft p-4 text-ink">
      <p>
        <strong className="text-amber">
          {unassigned.length} modèle{unassigned.length > 1 ? "s" : ""} en vente sans série
        </strong>{" "}
        : {unassigned.length > 1 ? "ils n'apparaissent" : "il n'apparaît"} pas dans la boutique tant qu&apos;
        {unassigned.length > 1 ? "ils ne sont rangés" : "il n'est rangé"} nulle part.
      </p>
      <ul className="space-y-2">
        {unassigned.map((item) => {
          const target = series.find((one) => one.id === (choice[item.deviceModelId] ?? series[0]?.id));
          return (
            <li key={item.deviceModelId} className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{item.name}</span>
              {series.length > 0 ? (
                <>
                  <label className="sr-only" htmlFor={`range-${item.deviceModelId}`}>
                    Série pour {item.name}
                  </label>
                  <select
                    id={`range-${item.deviceModelId}`}
                    className="input min-h-9 w-auto py-1 text-sm"
                    value={target?.id}
                    onChange={(event) => setChoice({ ...choice, [item.deviceModelId]: Number(event.target.value) })}
                  >
                    {series.map((one) => (
                      <option key={one.id} value={one.id}>
                        {one.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    disabled={!target || state.isLoading}
                    onClick={() => target && setModels({ id: target.id, modelIds: [...target.modelIds, item.deviceModelId] })}
                  >
                    Ranger
                  </button>
                </>
              ) : (
                <span className="text-sm text-ink-muted">Crée d&apos;abord une série ci-dessous.</span>
              )}
            </li>
          );
        })}
      </ul>
      {state.error ? <p className="field-error">{errorMessage(state.error)}</p> : null}
    </section>
  );
}
