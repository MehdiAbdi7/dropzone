"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchIcon } from "@/components/ui/icons";
import type { Category } from "@/types/api";

export default function ProductSearch({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const selectedCategories = searchParams.getAll("category");
  const [value, setValue] = useState(query);

  useEffect(() => {
    setValue(query);
  }, [query]);

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed === query.trim()) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("q", trimmed);
      params.delete("page");
      router.replace(`/produits?${params.toString()}`, { scroll: false });
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [query, router, searchParams, value]);

  function toggleCategory(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    const selected = new Set(params.getAll("category"));
    if (selected.has(slug)) {
      selected.delete(slug);
    } else {
      selected.add(slug);
    }
    params.delete("category");
    for (const category of selected) {
      params.append("category", category);
    }
    params.set("q", value.trim());
    params.delete("page");
    router.replace(`/produits?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="card space-y-4 p-3 sm:p-4">
      <form action="/produits" role="search" className="flex gap-2">
        <label htmlFor="product-search" className="sr-only">
          Rechercher un produit
        </label>
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            id="product-search"
            name="q"
            type="search"
            className="input w-full ps-10"
            placeholder="Rechercher un modèle…"
            autoComplete="off"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary shrink-0">
          Chercher
        </button>
        {selectedCategories.map((category) => (
          <input key={category} type="hidden" name="category" value={category} />
        ))}
      </form>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-ink-muted">Catégories (plusieurs choix possibles)</legend>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const selected = selectedCategories.includes(category.slug);
            return (
              <button
                key={category.slug}
                type="button"
                className="chip"
                aria-pressed={selected}
                onClick={() => toggleCategory(category.slug)}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
