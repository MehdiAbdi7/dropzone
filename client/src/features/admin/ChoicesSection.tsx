"use client";

import { useState } from "react";
import { CHOICE_GROUP_LABELS, type ChoiceGroup } from "@/config/catalog";
import { useChoicesQuery, useCreateChoiceMutation, useDeleteChoiceMutation } from "@/features/admin/adminApi";
import ColorHueChip, { DEFAULT_HUE } from "@/features/admin/ColorHueChip";
import { errorMessage } from "@/lib/errors";

// ---------- Les listes à cocher ----------

export default function ChoicesSection() {
  const { data: choices } = useChoicesQuery();
  const [createChoice, createState] = useCreateChoiceMutation();
  const [deleteChoice] = useDeleteChoiceMutation();
  const [drafts, setDrafts] = useState<Partial<Record<ChoiceGroup, string>>>({});
  // La teinte de la nouvelle couleur : obligatoire, elle donne la pastille et la lueur.
  const [newHue, setNewHue] = useState(DEFAULT_HUE);

  async function add(group: ChoiceGroup) {
    const label = drafts[group]?.trim();
    if (!label) {
      return;
    }
    try {
      await createChoice(group === "color" ? { group, label, hex: newHue } : { group, label }).unwrap();
      setDrafts({ ...drafts, [group]: "" });
      if (group === "color") {
        setNewHue(DEFAULT_HUE);
      }
    } catch {
      // Affiché sous la liste.
    }
  }

  return (
    <section aria-labelledby="choices" className="space-y-4">
      <h2 id="choices" className="text-2xl">
        Listes à cocher
      </h2>
      <p className="max-w-2xl text-ink-muted">
        Les valeurs proposées dans le formulaire produit. Retirer une valeur ne change aucun produit : chaque variante
        garde sa copie du texte.
      </p>
      {createState.error ? <p className="field-error">{errorMessage(createState.error)}</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {(Object.keys(CHOICE_GROUP_LABELS) as ChoiceGroup[]).map((group) => (
          <div key={group} className="card space-y-3 p-4">
            <h3 className="text-lg">{CHOICE_GROUP_LABELS[group]}</h3>
            {group === "color" ? (
              <p className="text-sm text-ink-muted">
                La teinte de chaque couleur donne sa pastille dans la boutique et la lueur derrière le modèle sur
                l&apos;affiche de la série. Clique sur la pastille pour la changer.
              </p>
            ) : null}
            <ul className="flex flex-wrap gap-2">
              {choices?.[group].map((choice) =>
                group === "color" ? (
                  <ColorHueChip key={choice.id} choice={choice} onRemove={() => deleteChoice(choice.id)} />
                ) : (
                <li key={choice.id} className="chip cursor-default">
                  {choice.label}
                  <button
                    type="button"
                    className="text-ink-muted hover:text-red"
                    aria-label={`Retirer ${choice.label}`}
                    onClick={() => deleteChoice(choice.id)}
                  >
                    ×
                  </button>
                </li>
                ),
              )}
            </ul>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                add(group);
              }}
            >
              {group === "color" ? (
                <label className="flex items-center">
                  <input
                    type="color"
                    aria-label="Teinte de la nouvelle couleur"
                    className="size-9 cursor-pointer rounded-lg"
                    value={newHue}
                    onChange={(event) => setNewHue(event.target.value)}
                  />
                </label>
              ) : null}
              <label className="flex-1">
                <span className="sr-only">Ajouter à {CHOICE_GROUP_LABELS[group]}</span>
                <input
                  className="input min-h-9 py-1 text-sm"
                  placeholder="Nouvelle valeur…"
                  value={drafts[group] ?? ""}
                  onChange={(event) => setDrafts({ ...drafts, [group]: event.target.value })}
                />
              </label>
              <button type="submit" className="btn btn-secondary btn-small">
                Ajouter
              </button>
            </form>
          </div>
        ))}
      </div>
    </section>
  );
}
