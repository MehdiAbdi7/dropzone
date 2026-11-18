"use client";

import { useState } from "react";
import ProductImage from "@/components/ui/ProductImage";
import BrandLogo from "@/components/ui/BrandLogo";
import { CONDITION_LABELS, DEVICE_KINDS } from "@/config/catalog";
import CategoryArt from "@/features/categories/CategoryArt";
import SeriesCard from "@/features/shop/SeriesCard";
import { formatPrice } from "@/lib/format";
import type { Category, PosterModel } from "@/types/api";
import {
  useShopCategoriesQuery,
  useShopColorsQuery,
  useShopPosterQuery,
  useShopSeriesQuery,
} from "../api/shopPickerApi";
import { useSearchVariantsQuery } from "../api/salesApi";
import { hitsOfModel, type VariantHit } from "./ticket";
import VariantDetailDialog from "./VariantDetailDialog";
import VariantPicker, { VariantCard } from "./VariantPicker";

type Condition = "new" | "refurbished" | undefined;

// La recherche de produit du comptoir, dans une fenêtre (refonte du 18/11) : le même parcours que le
// site en ligne (catégories, marques, séries, modèles), puis les variantes en stock du modèle choisi
// (neuf scellé, affaire, couleurs, stockages) à ajouter au ticket. Un onglet « Rechercher » garde la
// recherche par mots ou par SKU pour le vendeur qui sait ce qu'il veut.
export default function ShopPicker({ onPick }: { onPick: (hit: VariantHit) => void }) {
  const [tab, setTab] = useState<"browse" | "search">("browse");
  const [category, setCategory] = useState<Category | null>(null);
  const [brand, setBrand] = useState<string | null>(null);
  const [series, setSeries] = useState<{ slug: string; name: string } | null>(null);
  const [model, setModel] = useState<PosterModel | null>(null);
  // Le dernier ajout : la fenêtre reste ouverte (on peut ajouter plusieurs appareils), il faut donc
  // dire que le clic a marché.
  const [added, setAdded] = useState<string | null>(null);

  function pick(hit: VariantHit) {
    onPick(hit);
    setAdded(`${hit.productName}${hit.condition === "new" ? "" : " (affaire)"}`);
  }

  // Revenir à une étape plus haute efface celles qui la suivent.
  const toCategories = () => {
    setCategory(null);
    setBrand(null);
    setSeries(null);
    setModel(null);
  };
  const toCategory = () => {
    setBrand(null);
    setSeries(null);
    setModel(null);
  };

  const crumbs: { label: string; onClick: () => void }[] = [];
  if (category) crumbs.push({ label: "Catégories", onClick: toCategories });
  if (category && series) crumbs.push({ label: category.name, onClick: toCategory });
  if (series && model) crumbs.push({ label: series.name, onClick: () => setModel(null) });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Façon de chercher" className="flex gap-2">
          <Tab selected={tab === "browse"} onClick={() => setTab("browse")}>
            Parcourir
          </Tab>
          <Tab selected={tab === "search"} onClick={() => setTab("search")}>
            Rechercher
          </Tab>
        </div>
        {added ? (
          <p role="status" className="ml-auto rounded-full bg-blue-soft px-3 py-1 text-sm font-semibold">
            Ajouté au ticket : {added}
          </p>
        ) : null}
      </div>

      {tab === "search" ? (
        <VariantPicker grid onPick={pick} />
      ) : (
        <>
          {crumbs.length > 0 ? (
            <nav aria-label="Où je suis" className="flex flex-wrap items-center gap-1 text-sm">
              {crumbs.map((crumb) => (
                <span key={crumb.label} className="flex items-center gap-1">
                  <button type="button" className="font-semibold text-blue-ink underline-offset-2 hover:underline" onClick={crumb.onClick}>
                    {crumb.label}
                  </button>
                  <span aria-hidden="true" className="text-ink-muted">
                    ›
                  </span>
                </span>
              ))}
              <span className="font-semibold">{model?.name ?? series?.name ?? category?.name}</span>
            </nav>
          ) : null}

          {!category ? (
            <Categories onPick={setCategory} />
          ) : !DEVICE_KINDS.includes(category.kind) ? (
            // Les accessoires n'ont pas de séries : la même liste filtrée sur la catégorie.
            <VariantPicker grid initialCategory={category.slug} onPick={pick} />
          ) : model && series ? (
            <Variants category={category} model={model} onPick={pick} />
          ) : series && brand ? (
            <Models category={category} brand={brand} series={series.slug} onPick={setModel} />
          ) : (
            <Series
              category={category}
              brand={brand}
              onBrand={setBrand}
              onPick={(one) => {
                setSeries(one);
                setModel(null);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

function Tab({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={selected} className={`btn ${selected ? "btn-primary" : ""} px-4 py-1.5 text-sm`} onClick={onClick}>
      {children}
    </button>
  );
}

// L'étape 1 : les catégories, comme la page /boutique du site.
function Categories({ onPick }: { onPick: (category: Category) => void }) {
  const { data, isError, isLoading } = useShopCategoriesQuery();
  if (isError) return <p role="alert" className="field-error">Les catégories ne répondent pas, réessayez.</p>;
  if (isLoading || !data) return <p className="text-ink-muted">Chargement…</p>;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
      {data.map((category) => {
        const empty = category.productCount === 0;
        return (
          <li key={category.slug} className="flex">
            <button
              type="button"
              disabled={empty}
              onClick={() => onPick(category)}
              className="block h-full w-full rounded-[var(--radius-block)] border border-line bg-surface text-center transition-[border-color,transform] enabled:hover:-translate-y-1 enabled:hover:border-blue-ink disabled:opacity-45"
            >
              <span className="relative mx-3 mt-3 block aspect-[5/4] overflow-hidden">
                <CategoryArt
                  category={{ kind: category.kind, photos: category.photos, fallbackImage: category.fallbackImage }}
                  className="absolute inset-0"
                  sizes="(min-width: 768px) 200px, 45vw"
                />
              </span>
              <span className={`block px-3 pt-1 pb-4 font-display text-sm font-bold sm:text-base ${empty ? "line-through" : ""}`}>
                {category.name}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// L'étape 2 : les puces de marques et les affiches des séries, comme la page d'une catégorie.
function Series({
  category,
  brand,
  onBrand,
  onPick,
}: {
  category: Category;
  brand: string | null;
  onBrand: (slug: string) => void;
  onPick: (series: { slug: string; name: string }) => void;
}) {
  const { data: groups, isError, isLoading } = useShopSeriesQuery(category.slug);
  const { data: palette } = useShopColorsQuery();
  if (isError) return <p role="alert" className="field-error">Les séries ne répondent pas, réessayez.</p>;
  if (isLoading || !groups) return <p className="text-ink-muted">Chargement…</p>;
  if (groups.length === 0) return <p className="card p-4">Aucun appareil de cette catégorie pour le moment.</p>;
  const group = groups.find((one) => one.brand.slug === brand) ?? groups[0];

  return (
    <div className="space-y-4">
      <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] md:flex-wrap md:overflow-visible">
        {groups.map((one) => (
          <li key={one.brand.slug} className="shrink-0">
            <button
              type="button"
              aria-pressed={one.brand.slug === group.brand.slug}
              onClick={() => onBrand(one.brand.slug)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 font-display text-sm font-bold transition-colors ${
                one.brand.slug === group.brand.slug
                  ? "border-blue bg-blue text-on-brand"
                  : "border-line bg-surface text-ink-muted hover:border-ink-muted hover:text-ink"
              }`}
            >
              {one.brand.logoUrl ? (
                <BrandLogo url={one.brand.logoUrl} size={16} width={one.brand.logoUrl.startsWith("/brands/") ? 40 : 16} />
              ) : null}
              {one.brand.name}
            </button>
          </li>
        ))}
      </ul>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        {group.series.map((one, index) => (
          <li key={one.slug}>
            <SeriesCard
              series={one}
              palette={palette ?? {}}
              priority={index === 0}
              onSelect={() => {
                onBrand(group.brand.slug);
                onPick({ slug: one.slug, name: one.name });
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

// L'étape 3 : les modèles de la série (les colonnes de l'affiche), un seul clic pour voir ses variantes.
function Models({
  category,
  brand,
  series,
  onPick,
}: {
  category: Category;
  brand: string;
  series: string;
  onPick: (model: PosterModel) => void;
}) {
  const { data, isError, isLoading } = useShopPosterQuery({ category: category.slug, brand, series });
  if (isError) return <p role="alert" className="field-error">Cette série ne répond pas, réessayez.</p>;
  if (isLoading || !data) return <p className="text-ink-muted">Chargement…</p>;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
      {data.models.map((model) => {
        const available = model.onSale && !model.soldOut;
        return (
          <li key={model.name} className="flex">
            <button
              type="button"
              disabled={!available}
              onClick={() => onPick(model)}
              className="card flex w-full flex-col gap-2 p-2.5 text-left transition-[border-color] enabled:hover:border-blue-ink disabled:opacity-50"
            >
              <span className="relative block aspect-square overflow-hidden rounded-[10px] bg-surface-2">
                <ProductImage src={model.image} alt="" sizes="(min-width: 1280px) 200px, 40vw" />
                {!available ? <span className="badge badge-out absolute left-2 top-2">Épuisé</span> : null}
              </span>
              <span className={`text-sm leading-snug font-semibold ${available ? "" : "line-through"}`}>{model.name}</span>
              <span className="mt-auto space-y-0.5 text-xs text-ink-muted">
                {model.newFrom !== null ? <span className="block">Neuf dès {formatPrice(model.newFrom)}</span> : null}
                {model.dealFrom !== null ? <span className="block">Affaire dès {formatPrice(model.dealFrom)}</span> : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// L'étape 4 : les variantes en stock du modèle (neuf scellé, affaires), à ajouter au ticket.
function Variants({ category, model, onPick }: { category: Category; model: PosterModel; onPick: (hit: VariantHit) => void }) {
  const [condition, setCondition] = useState<Condition>(undefined);
  // L'appareil dont on regarde la fiche (bouton « Détail » des cartes).
  const [detail, setDetail] = useState<VariantHit | null>(null);
  const { data, isError, isFetching } = useSearchVariantsQuery({ q: model.name, category: category.slug, condition, limit: 200 });
  const hits = data ? hitsOfModel(data.hits, model.name) : [];
  const states: { value: Condition; label: string }[] = [
    { value: undefined, label: "Tous les états" },
    { value: "new", label: CONDITION_LABELS.new },
    { value: "refurbished", label: CONDITION_LABELS.refurbished },
  ];

  return (
    <div className="space-y-3">
      <div role="group" aria-label="État" className="flex flex-wrap gap-2">
        {states.map((item) => (
          <button
            key={item.label}
            type="button"
            aria-pressed={condition === item.value}
            className={`btn ${condition === item.value ? "btn-primary" : ""} px-3 py-1 text-sm`}
            onClick={() => setCondition(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {isError ? (
        <p role="alert" className="field-error">
          La recherche ne répond pas, réessayez.
        </p>
      ) : data && hits.length === 0 && !isFetching ? (
        <p className="card p-4 text-ink-muted">Aucune variante en stock pour ce modèle.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" aria-busy={isFetching}>
          {hits.map((hit) => (
            <li key={hit.sku}>
              <VariantCard hit={hit} onPick={onPick} onDetail={setDetail} />
            </li>
          ))}
        </ul>
      )}
      <VariantDetailDialog hit={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
