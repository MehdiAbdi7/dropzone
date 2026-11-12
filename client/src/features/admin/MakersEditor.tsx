"use client";

import { useState, type FormEvent } from "react";
import BrandLogo from "@/components/ui/BrandLogo";
import { errorMessage } from "@/lib/errors";
import {
  useCreateMakerMutation,
  useDeleteMakerMutation,
  useMakersQuery,
  useUpdateMakerMutation,
  useUploadMakerLogoMutation,
  type AdminMaker,
} from "@/features/admin/api/catalogApi";

// Les marques d'un type d'accessoires (Apple, Samsung, Anker dans Chargeurs), dans l'ordre des
// tuiles de la Boutique : l'étape marque entre le type et les affiches (12/11). L'API pose toute
// seule le logo d'une marque connue (Simple Icons) ; sinon, on envoie le sien.
export default function MakersEditor({ typeId, typeName }: { typeId: number; typeName: string }) {
  const { data: all = [] } = useMakersQuery();
  const makers = all.filter((maker) => maker.typeId === typeId);
  const [create, createState] = useCreateMakerMutation();
  const [update] = useUpdateMakerMutation();
  const [name, setName] = useState("");

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    try {
      await create({ typeId, name }).unwrap();
      setName("");
    } catch {
      // Affiché sous le formulaire.
    }
  }

  // Monter ou descendre : on renumérote la rangée entière (0, 1, 2…), puis on n'envoie que les
  // marques dont la position change.
  function move(index: number, step: -1 | 1) {
    const order = [...makers];
    const [moved] = order.splice(index, 1);
    order.splice(index + step, 0, moved);
    order.forEach((maker, position) => {
      if (maker.position !== position) {
        update({ id: maker.id, position });
      }
    });
  }

  return (
    <div className="space-y-3 rounded-[10px] bg-surface-2 p-3">
      <p className="text-sm font-semibold">Marques de « {typeName} »</p>
      {makers.length > 0 ? (
        <ul className="space-y-2">
          {makers.map((maker, index) => (
            <li key={maker.id}>
              <MakerRow
                maker={maker}
                canMoveUp={index > 0}
                canMoveDown={index < makers.length - 1}
                onMove={(step) => move(index, step)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted">Aucune marque pour l&apos;instant : les produits du type s&apos;affichent tous ensemble.</p>
      )}

      <form onSubmit={onCreate} className="flex flex-wrap items-end gap-2">
        <label className="min-w-40 flex-1">
          <span className="label">Ajouter une marque</span>
          <input className="input" value={name} placeholder="Apple, Samsung, Anker…" onChange={(event) => setName(event.target.value)} />
        </label>
        <button type="submit" className="btn btn-secondary" disabled={createState.isLoading || !name.trim()}>
          Ajouter
        </button>
        {createState.error ? <p className="field-error w-full">{errorMessage(createState.error)}</p> : null}
      </form>
    </div>
  );
}

function MakerRow({
  maker,
  canMoveUp,
  canMoveDown,
  onMove,
}: {
  maker: AdminMaker;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (step: -1 | 1) => void;
}) {
  const [update, updateState] = useUpdateMakerMutation();
  const [upload, uploadState] = useUploadMakerLogoMutation();
  const [remove, removeState] = useDeleteMakerMutation();
  const [name, setName] = useState(maker.name);
  const error = updateState.error ?? uploadState.error ?? removeState.error;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-ink" title={maker.logoUrl ? "Logo" : "Pas de logo"}>
          {maker.logoUrl ? <BrandLogo url={maker.logoUrl} size={18} /> : <span className="text-xs text-ink-muted">—</span>}
        </span>
        <label className="min-w-32 flex-1">
          <span className="sr-only">Nom de la marque</span>
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <span className="text-sm text-ink-muted">
          {maker.productCount} produit{maker.productCount > 1 ? "s" : ""}
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          disabled={!canMoveUp}
          aria-label={`Monter ${maker.name}`}
          onClick={() => onMove(-1)}
        >
          ↑
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          disabled={!canMoveDown}
          aria-label={`Descendre ${maker.name}`}
          onClick={() => onMove(1)}
        >
          ↓
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          disabled={name.trim() === maker.name || !name.trim()}
          onClick={() => update({ id: maker.id, name: name.trim() })}
        >
          Enregistrer
        </button>
        {/* Un <label> autour du champ fichier : le bouton ouvre le sélecteur, sans JavaScript en plus. */}
        <label className="btn btn-secondary btn-small cursor-pointer">
          {uploadState.isLoading ? "Envoi…" : maker.logoUrl ? "Changer le logo" : "Envoyer un logo"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                upload({ id: maker.id, file });
              }
              event.target.value = "";
            }}
          />
        </label>
        <button type="button" className="btn btn-danger btn-small" onClick={() => remove(maker.id)}>
          Supprimer
        </button>
      </div>
      {error ? <p className="field-error">{errorMessage(error)}</p> : null}
    </div>
  );
}
