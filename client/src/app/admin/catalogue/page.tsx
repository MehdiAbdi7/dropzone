"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import Field from "@/components/ui/Field";
import { DEVICE_KINDS, KIND_LABELS } from "@/config/catalog";
import { useCatalogQuery, useCreateCategoryMutation } from "@/features/admin/adminApi";
import CatalogTile, { AddTile } from "@/features/admin/catalog/CatalogTile";
import { errorMessage } from "@/lib/errors";
import type { ProductKind } from "@/types/api";

const KINDS = Object.keys(KIND_LABELS) as ProductKind[];
const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? "s" : ""}`;

// Écran 1 du Catalogue : les catégories, avec ce qu'elles contiennent et leur stock.
// On y entre comme dans la Boutique : catégorie, marque, série, modèle.
export default function CatalogPage() {
  const { data: categories, isLoading, error } = useCatalogQuery();
  const [create, createState] = useCreateCategoryMutation();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ProductKind>("accessory");

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    try {
      await create({ name, kind }).unwrap();
      setName("");
    } catch {
      // Affiché sous le formulaire.
    }
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl">Catalogue</h1>
          <p className="text-ink-muted">Choisis une catégorie. Le stock est compté à chaque étape, brouillons compris.</p>
        </div>
        <Link href="/admin/catalogue/modeles" className="btn btn-secondary btn-small">
          Tous les modèles
        </Link>
      </div>

      {error ? <p className="field-error">{errorMessage(error)}</p> : null}
      {isLoading ? <p className="text-ink-muted">Chargement…</p> : null}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories?.map((category) => (
          <li key={category.id}>
            <CatalogTile
              href={`/admin/catalogue/${category.id}`}
              title={category.name}
              subtitle={
                DEVICE_KINDS.includes(category.kind)
                  ? `${plural(category.brandCount, "marque")} · ${plural(category.seriesCount, "série")} · ${plural(category.modelCount, "modèle")}`
                  : `Sans séries · ${plural(category.productCount, "produit")}`
              }
              newStock={category.newStock}
              dealCount={category.dealCount}
            />
          </li>
        ))}
        <li>
          <AddTile>
            <form onSubmit={onCreate} className="space-y-3">
              <Field id="category-name" label="+ Nouvelle catégorie">
                <input id="category-name" className="input" value={name} onChange={(event) => setName(event.target.value)} />
              </Field>
              <Field id="category-kind" label="Sorte">
                <select id="category-kind" className="input" value={kind} onChange={(event) => setKind(event.target.value as ProductKind)}>
                  {KINDS.map((value) => (
                    <option key={value} value={value}>
                      {KIND_LABELS[value]}
                    </option>
                  ))}
                </select>
              </Field>
              <button type="submit" className="btn btn-primary btn-small" disabled={createState.isLoading || name.trim().length < 2}>
                Créer
              </button>
              {createState.error ? <p className="field-error">{errorMessage(createState.error)}</p> : null}
            </form>
          </AddTile>
        </li>
      </ul>
    </div>
  );
}
