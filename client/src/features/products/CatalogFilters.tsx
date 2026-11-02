"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Category } from "@/types/api";

// Les filtres du catalogue vivent dans l'URL : une recherche se partage, se met en
// favori, et le bouton Retour du navigateur fonctionne. Changer un filtre réécrit
// l'URL, et la page (Server Component) relit l'API avec les nouveaux paramètres.
export default function CatalogFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // un nouveau filtre repart de la page 1
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const condition = searchParams.get("condition") ?? "";

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="min-w-44 flex-1 sm:flex-none">
        <span className="label">Catégorie</span>
        <select
          className="input"
          value={searchParams.get("category") ?? ""}
          onChange={(event) => update("category", event.target.value)}
        >
          <option value="">Toutes</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="label">État</legend>
        <div className="flex gap-2">
          {[
            { value: "", label: "Tous" },
            { value: "neuf", label: "Neuf" },
            { value: "reconditionne", label: "Reconditionné" },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              className="chip"
              aria-pressed={condition === option.value}
              onClick={() => update("condition", option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="ml-auto min-w-44">
        <span className="label">Trier par</span>
        <select
          className="input"
          value={searchParams.get("sort") ?? "nouveautes"}
          onChange={(event) => update("sort", event.target.value === "nouveautes" ? "" : event.target.value)}
        >
          <option value="nouveautes">Nouveautés</option>
          <option value="prix-croissant">Prix croissant</option>
          <option value="prix-decroissant">Prix décroissant</option>
        </select>
      </label>
    </div>
  );
}
