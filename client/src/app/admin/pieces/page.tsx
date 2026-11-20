"use client";

import { useState } from "react";
import { usePartsQuery } from "@/features/admin/api/partsApi";
import PartCard from "@/features/admin/parts/PartCard";
import PartFormDialog from "@/features/admin/parts/PartFormDialog";
import { errorMessage } from "@/lib/errors";
import { useDebouncedValue } from "@/lib/useDebouncedValue";

// Les pièces de l'atelier (18/11, étape 1) : le stock de batteries, d'écrans… qui servira aux réparations.
// Chaque pièce a un nom, un prix d'achat (moyen), un prix de vente et une quantité ; une pièce épuisée reste dans
// la liste, en rouge, pour savoir ce qu'on ne peut pas réparer.
export default function PartsPage() {
  const [text, setText] = useState("");
  const [creating, setCreating] = useState(false);
  // La recherche attend une pause dans la saisie : chaque touche relancerait la requête.
  const search = useDebouncedValue(text.trim());
  const { data, error, isLoading } = usePartsQuery(search);

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl">Pièces</h1>
          <p className="text-ink-muted">Le stock de pièces : ce qu&apos;on peut réparer dépend des pièces qu&apos;il reste.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
          Nouvelle pièce
        </button>
      </div>

      <label className="block max-w-md">
        <span className="sr-only">Chercher une pièce</span>
        <input
          className="input"
          type="search"
          autoComplete="off"
          maxLength={60}
          placeholder="Chercher une pièce : batterie, écran…"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>

      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
        </p>
      ) : isLoading ? (
        <p className="text-ink-muted">Chargement…</p>
      ) : data?.length ? (
        <ul className="card divide-y divide-line overflow-hidden p-0">
          {data.map((part) => (
            <PartCard key={part.id} part={part} />
          ))}
        </ul>
      ) : (
        <p className="text-ink-muted">{search ? "Aucune pièce ne correspond à cette recherche." : "Aucune pièce pour l'instant : ajoutez la première."}</p>
      )}

      <PartFormDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
