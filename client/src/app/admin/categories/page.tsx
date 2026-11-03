"use client";

import { useState, type FormEvent } from "react";
import Field from "@/components/ui/Field";
import { DEVICE_KINDS, KIND_LABELS } from "@/config/catalog";
import BrandsEditor from "@/features/admin/BrandsEditor";
import {
  useCategoriesQuery,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useUpdateCategoryMutation,
} from "@/features/admin/adminApi";
import { errorMessage } from "@/lib/errors";
import type { Category, ProductKind } from "@/types/api";

const KINDS = Object.keys(KIND_LABELS) as ProductKind[];

export default function AdminCategoriesPage() {
  const { data: categories = [] } = useCategoriesQuery();
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
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl">Catégories</h1>
      <p className="text-ink-muted">
        La sorte décide du formulaire produit : modèle d&apos;appareil, options proposées et affaires autorisées.
      </p>

      <ul className="card divide-y divide-line">
        {categories.map((category) => (
          <li key={category.id}>
            <CategoryRow category={category} />
          </li>
        ))}
      </ul>

      <form onSubmit={onCreate} className="card grid gap-4 p-5 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
        <Field id="category-name" label="Nouvelle catégorie">
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
        <button type="submit" className="btn btn-primary" disabled={createState.isLoading || name.trim().length < 2}>
          Créer
        </button>
        {createState.error ? <p className="field-error sm:col-span-3">{errorMessage(createState.error)}</p> : null}
      </form>
    </div>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const [update, updateState] = useUpdateCategoryMutation();
  const [remove, removeState] = useDeleteCategoryMutation();
  const [name, setName] = useState(category.name);
  const error = updateState.error ?? removeState.error;

  return (
    <div className="space-y-2 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="min-w-48 flex-1">
          <span className="sr-only">Nom de la catégorie</span>
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <span className="text-sm text-ink-muted">
          {KIND_LABELS[category.kind]}, {category.productCount} produit{category.productCount > 1 ? "s" : ""} publié
          {category.productCount > 1 ? "s" : ""}
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          disabled={name === category.name || name.trim().length < 2}
          onClick={() => update({ id: category.id, name })}
        >
          Renommer
        </button>
        <button type="button" className="btn btn-danger btn-small" onClick={() => remove(category.id)}>
          Supprimer
        </button>
      </div>
      {error ? <p className="field-error">{errorMessage(error)}</p> : null}
      <BrandsEditor categoryId={category.id} isDevice={DEVICE_KINDS.includes(category.kind)} />
    </div>
  );
}
