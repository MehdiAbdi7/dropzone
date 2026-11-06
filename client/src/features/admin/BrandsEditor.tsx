"use client";

import { useState, type FormEvent } from "react";
import BrandLogo from "@/components/ui/BrandLogo";
import { errorMessage } from "@/lib/errors";
import {
  useBrandsQuery,
  useCreateBrandMutation,
  useDeleteBrandMutation,
  useUpdateBrandMutation,
  useUploadBrandLogoMutation,
  type AdminBrand,
} from "./adminApi";

// Les marques d'une catégorie, dans l'ordre des puces de la Boutique. L'API pose
// toute seule le logo d'une marque connue (Simple Icons) ; sinon, on envoie le sien.
// Dans une catégorie d'accessoires (06/11), les mêmes lignes de `brands` servent de types
// (Coques, Chargeurs…) : la Boutique et le back-office les montrent sous ce nom.
export default function BrandsEditor({ categoryId, isDevice }: { categoryId: number; isDevice: boolean }) {
  const { data: all = [] } = useBrandsQuery();
  const brands = all.filter((brand) => brand.categoryId === categoryId);
  const [create, createState] = useCreateBrandMutation();
  const [update] = useUpdateBrandMutation();
  const [name, setName] = useState("");
  const [makerName, setMakerName] = useState("");

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    try {
      await create({ categoryId, name, makerName: makerName.trim() || null }).unwrap();
      setName("");
      setMakerName("");
    } catch {
      // Affiché sous le formulaire.
    }
  }

  // Monter ou descendre : on renumérote la rangée entière (0, 1, 2…), puis on
  // n'envoie que les marques dont la position change.
  function move(index: number, step: -1 | 1) {
    const order = [...brands];
    const [moved] = order.splice(index, 1);
    order.splice(index + step, 0, moved);
    order.forEach((brand, position) => {
      if (brand.position !== position) {
        update({ id: brand.id, position });
      }
    });
  }

  return (
    <div className="space-y-3 rounded-[10px] bg-surface-2 p-3">
      <p className="text-sm font-semibold">{isDevice ? "Marques" : "Types d'accessoires"}</p>
      {brands.length > 0 ? (
        <ul className="space-y-2">
          {brands.map((brand, index) => (
            <li key={brand.id}>
              <BrandRow
                brand={brand}
                isDevice={isDevice}
                canMoveUp={index > 0}
                canMoveDown={index < brands.length - 1}
                onMove={(step) => move(index, step)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted">{isDevice ? "Aucune marque" : "Aucun type"} pour l&apos;instant.</p>
      )}

      <form onSubmit={onCreate} className="flex flex-wrap items-end gap-2">
        <label className="min-w-40 flex-1">
          <span className="label">{isDevice ? "Ajouter une marque" : "Ajouter un type"}</span>
          <input
            className="input"
            value={name}
            placeholder={isDevice ? "Realme" : "Coques, Chargeurs, Écouteurs…"}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        {isDevice ? (
          <label className="min-w-40 flex-1">
            <span className="label">Fabricant des modèles</span>
            <input
              className="input"
              value={makerName}
              placeholder="Apple pour « iPhone »"
              onChange={(event) => setMakerName(event.target.value)}
            />
          </label>
        ) : null}
        <button type="submit" className="btn btn-secondary" disabled={createState.isLoading || !name.trim()}>
          Ajouter
        </button>
        {createState.error ? <p className="field-error w-full">{errorMessage(createState.error)}</p> : null}
      </form>
    </div>
  );
}

function BrandRow({
  brand,
  isDevice,
  canMoveUp,
  canMoveDown,
  onMove,
}: {
  brand: AdminBrand;
  isDevice: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (step: -1 | 1) => void;
}) {
  const [update, updateState] = useUpdateBrandMutation();
  const [upload, uploadState] = useUploadBrandLogoMutation();
  const [remove, removeState] = useDeleteBrandMutation();
  const [name, setName] = useState(brand.name);
  const [makerName, setMakerName] = useState(brand.makerName ?? "");
  const error = updateState.error ?? uploadState.error ?? removeState.error;
  const changed = name.trim() !== brand.name || (makerName.trim() || null) !== brand.makerName;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-ink" title={brand.logoUrl ? "Logo" : "Pas de logo"}>
          {brand.logoUrl ? <BrandLogo url={brand.logoUrl} size={18} /> : <span className="text-xs text-ink-muted">—</span>}
        </span>
        <label className="min-w-32 flex-1">
          <span className="sr-only">{isDevice ? "Nom de la marque" : "Nom du type"}</span>
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        {isDevice ? (
          <label className="min-w-28 flex-1">
            <span className="sr-only">Fabricant des modèles</span>
            <input
              className="input"
              value={makerName}
              placeholder="Fabricant"
              onChange={(event) => setMakerName(event.target.value)}
            />
          </label>
        ) : null}
        <span className="text-sm text-ink-muted">
          {brand.productCount} produit{brand.productCount > 1 ? "s" : ""}
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          disabled={!canMoveUp}
          aria-label={`Monter ${brand.name}`}
          onClick={() => onMove(-1)}
        >
          ↑
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          disabled={!canMoveDown}
          aria-label={`Descendre ${brand.name}`}
          onClick={() => onMove(1)}
        >
          ↓
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-small"
          disabled={!changed || !name.trim()}
          onClick={() => update({ id: brand.id, name: name.trim(), makerName: makerName.trim() || null })}
        >
          Enregistrer
        </button>
        {/* Un <label> autour du champ fichier : le bouton ouvre le sélecteur, sans JavaScript en plus. */}
        <label className="btn btn-secondary btn-small cursor-pointer">
          {uploadState.isLoading
            ? "Envoi…"
            : isDevice
              ? brand.logoUrl
                ? "Changer le logo"
                : "Envoyer un logo"
              : brand.logoUrl
                ? "Changer l'icône"
                : "Envoyer une icône"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                upload({ id: brand.id, file });
              }
              event.target.value = "";
            }}
          />
        </label>
        <button type="button" className="btn btn-danger btn-small" onClick={() => remove(brand.id)}>
          Supprimer
        </button>
      </div>
      {error ? <p className="field-error">{errorMessage(error)}</p> : null}
    </div>
  );
}
