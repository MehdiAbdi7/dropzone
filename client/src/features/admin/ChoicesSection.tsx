"use client";

import { useState } from "react";
import { CHOICE_GROUP_LABELS, type ChoiceGroup } from "@/config/catalog";
import {
  useChoicesQuery,
  useCreateChoiceMutation,
  useDeleteChoiceMutation,
  type Choice,
} from "@/features/admin/adminApi";
import ColorHueChip, { DEFAULT_HUE } from "@/features/admin/ColorHueChip";
import EditDialog from "@/features/admin/products/EditDialog";
import { errorMessage } from "@/lib/errors";

// Combien de valeurs on montre sur la carte de résumé avant « +N ».
const PREVIEW_COUNT = 6;

// ---------- Les listes à cocher ----------
// Une carte courte par liste (05/11), comme la fiche produit : son nom, son nombre de valeurs
// et les premières. « Modifier » ouvre une fenêtre où la recherche et l'ajout restent en haut.

export default function ChoicesSection() {
  const { data: choices } = useChoicesQuery();
  const [open, setOpen] = useState<ChoiceGroup | null>(null);
  const groups = Object.keys(CHOICE_GROUP_LABELS) as ChoiceGroup[];

  return (
    <section aria-labelledby="choices" className="space-y-4">
      <h2 id="choices" className="text-2xl">
        Listes à cocher
      </h2>
      <p className="max-w-2xl text-ink-muted">
        Les valeurs proposées dans le formulaire produit. Retirer une valeur ne change aucun produit : chaque variante
        garde sa copie du texte.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => {
          const values = choices?.[group] ?? [];
          return (
            <li key={group}>
              <button
                type="button"
                onClick={() => setOpen(group)}
                className="card flex h-full w-full flex-col gap-2 p-4 text-left transition-[border-color,box-shadow] hover:border-blue-ink hover:shadow-[var(--shadow)]"
              >
                <span className="flex w-full items-baseline justify-between gap-2">
                  <span className="font-display text-lg font-bold">{CHOICE_GROUP_LABELS[group]}</span>
                  <span className="text-sm text-ink-muted">{values.length}</span>
                </span>
                <Preview group={group} values={values} />
                <span className="mt-auto text-sm font-semibold text-blue-ink">Modifier →</span>
              </button>
            </li>
          );
        })}
      </ul>
      {open ? <GroupDialog group={open} values={choices?.[open] ?? []} onClose={() => setOpen(null)} /> : null}
    </section>
  );
}

// Les premières valeurs de la liste, en texte (avec la pastille pour les couleurs).
function Preview({ group, values }: { group: ChoiceGroup; values: Choice[] }) {
  if (values.length === 0) {
    return <span className="text-sm text-ink-muted">Aucune valeur</span>;
  }
  const rest = values.length - PREVIEW_COUNT;
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
      {values.slice(0, PREVIEW_COUNT).map((choice) => (
        <span key={choice.id} className="inline-flex items-center gap-1">
          {group === "color" ? (
            <span className="size-3 rounded-full border border-line" style={{ background: choice.hex ?? DEFAULT_HUE }} />
          ) : null}
          {choice.label}
        </span>
      ))}
      {rest > 0 ? <span>+{rest}</span> : null}
    </span>
  );
}

// La recherche ignore la casse et les accents : « bleu » trouve « Bleu intense ».
const normalize = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

// La fenêtre d'une liste : la recherche et l'ajout dans la barre collée en haut,
// toutes les valeurs (filtrées) en dessous.
function GroupDialog({ group, values, onClose }: { group: ChoiceGroup; values: Choice[]; onClose: () => void }) {
  const [createChoice, createState] = useCreateChoiceMutation();
  const [deleteChoice] = useDeleteChoiceMutation();
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  // La teinte de la nouvelle couleur : obligatoire, elle donne la pastille et la lueur.
  const [newHue, setNewHue] = useState(DEFAULT_HUE);
  const isColor = group === "color";
  const filtered = values.filter((choice) => normalize(choice.label).includes(normalize(search.trim())));

  async function add() {
    const label = draft.trim();
    if (!label) {
      return;
    }
    try {
      await createChoice(isColor ? { group, label, hex: newHue } : { group, label }).unwrap();
      setDraft("");
      setNewHue(DEFAULT_HUE);
    } catch {
      // Affiché sous la barre d'ajout.
    }
  }

  const toolbar = (
    <>
      <label className="block">
        <span className="sr-only">Rechercher dans {CHOICE_GROUP_LABELS[group]}</span>
        <input
          type="search"
          className="input min-h-9 py-1 text-sm"
          placeholder={`Rechercher parmi ${values.length} valeurs…`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <div className="flex gap-2">
        {isColor ? (
          <input
            type="color"
            aria-label="Teinte de la nouvelle couleur"
            className="size-9 shrink-0 cursor-pointer rounded-lg"
            value={newHue}
            onChange={(event) => setNewHue(event.target.value)}
          />
        ) : null}
        <label className="min-w-0 flex-1">
          <span className="sr-only">Ajouter à {CHOICE_GROUP_LABELS[group]}</span>
          <input
            className="input min-h-9 py-1 text-sm"
            placeholder="Nouvelle valeur…"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            // La fenêtre bloque Entrée dans les champs : ce champ-ci ajoute lui-même.
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                add();
              }
            }}
          />
        </label>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          disabled={createState.isLoading || draft.trim() === ""}
          onClick={add}
        >
          Ajouter
        </button>
      </div>
      {createState.error ? <p className="field-error">{errorMessage(createState.error)}</p> : null}
    </>
  );

  return (
    <EditDialog open title={CHOICE_GROUP_LABELS[group]} onClose={onClose} toolbar={toolbar}>
      {isColor ? (
        <p className="text-sm text-ink-muted">
          La teinte de chaque couleur donne sa pastille dans la boutique et la lueur derrière le modèle sur
          l&apos;affiche de la série. Clique sur la pastille pour la changer.
        </p>
      ) : null}
      {filtered.length === 0 ? (
        <p className="text-sm text-ink-muted">{search ? "Aucune valeur ne correspond." : "Aucune valeur."}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {filtered.map((choice) =>
            isColor ? (
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
      )}
    </EditDialog>
  );
}
