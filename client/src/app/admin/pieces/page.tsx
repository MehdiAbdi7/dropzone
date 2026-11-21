"use client";

import { useState } from "react";
import { useAdminRole } from "@/features/admin/AdminRoleContext";
import { usePartCategoriesQuery, usePartsQuery } from "@/features/admin/api/partsApi";
import PartCard from "@/features/admin/parts/PartCard";
import PartsManagerDialog from "@/features/admin/parts/PartsManagerDialog";
import { activeCategoryId, visibleParts } from "@/features/admin/parts/partsView";
import { repairCapabilities } from "@/features/admin/repairs/repairsView";
import { errorMessage } from "@/lib/errors";

// Les pièces de l'atelier (18/11, étape 1) : le stock de batteries, d'écrans… qui servira aux réparations.
// Depuis le 21/11 : des cartes rangées par catégorie (un bouton par catégorie, créées à la main), et un bouton
// « Ajout et personnalisation » en haut à droite qui ouvre une fenêtre (nouvelle pièce, catégories) au lieu d'une page
// de plus. Chaque pièce a un nom, un prix d'achat (moyen), un prix de vente et une quantité ; une pièce épuisée reste
// affichée, en rouge, pour savoir ce qu'on ne peut pas réparer.
export default function PartsPage() {
  const [text, setText] = useState("");
  const [wanted, setWanted] = useState<number | null>(null);
  const [managing, setManaging] = useState(false);
  const caps = repairCapabilities(useAdminRole());
  // Toutes les pièces d'un coup (une liste courte) : le filtre par catégorie et la recherche se font ici, sans nouvel appel.
  const parts = usePartsQuery("");
  const categories = usePartCategoriesQuery();
  const error = parts.error ?? categories.error;
  const active = activeCategoryId(categories.data ?? [], wanted);
  const searching = text.trim() !== "";
  const shown = visibleParts(parts.data ?? [], active, text);
  const nameOf = (id: number) => categories.data?.find((category) => category.id === id)?.name;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl">Pièces</h1>
          <p className="text-ink-muted">Le stock de pièces : ce qu&apos;on peut réparer dépend des pièces qu&apos;il reste.</p>
        </div>
        {caps.createsPart ? (
          <button type="button" className="btn btn-primary" onClick={() => setManaging(true)}>
            Ajout et personnalisation
          </button>
        ) : null}
      </div>

      {categories.data?.length ? (
        // Une rangée qui défile sur téléphone (les catégories ne s'empilent pas sur plusieurs lignes), à la ligne dès 768 px.
        <div role="group" aria-label="Catégories de pièces" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] md:flex-wrap md:overflow-visible md:pb-0">
          {categories.data.map((category) => (
            <button
              key={category.id}
              type="button"
              className="chip shrink-0 whitespace-nowrap"
              aria-pressed={!searching && active === category.id}
              onClick={() => {
                setWanted(category.id);
                setText("");
              }}
            >
              {category.name}
              <span className="ml-2 text-xs text-ink-muted">{category.partsCount}</span>
            </button>
          ))}
        </div>
      ) : null}

      <label className="block max-w-md">
        <span className="sr-only">Chercher une pièce</span>
        <input
          className="input"
          type="search"
          autoComplete="off"
          maxLength={60}
          placeholder="Chercher une pièce (toutes catégories)"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>

      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : parts.isLoading || categories.isLoading ? (
        <p className="text-ink-muted">Chargement…</p>
      ) : categories.data?.length === 0 ? (
        <p className="text-ink-muted">
          Aucune catégorie pour l&apos;instant.{" "}
          {caps.editsPart ? "Ouvre « Ajout et personnalisation » pour créer la première (Batterie, Afficheur…)." : "Demande à l'administrateur d'en créer."}
        </p>
      ) : shown.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((part) => (
            <PartCard key={part.id} part={part} categoryName={searching ? nameOf(part.categoryId) : undefined} />
          ))}
        </ul>
      ) : (
        <p className="text-ink-muted">{searching ? "Aucune pièce ne correspond à cette recherche." : "Aucune pièce dans cette catégorie : ajoutes-en une avec « Ajout et personnalisation »."}</p>
      )}

      <PartsManagerDialog open={managing} onClose={() => setManaging(false)} activeCategoryId={active} canEditCategories={caps.editsPart} />
    </div>
  );
}
