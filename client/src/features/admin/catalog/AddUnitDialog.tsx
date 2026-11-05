"use client";

import { useState, type FormEvent } from "react";
import { errorMessage } from "@/lib/errors";
import type { Condition, ProductKind } from "@/types/api";
import { useAddUnitMutation } from "../adminApi";
import EditDialog from "../products/EditDialog";
import { suggestSku, unitDraft, variantBody, type VariantDraft } from "../products/productDraft";
import VariantEditor from "../products/VariantEditor";

// L'ajout d'un exemplaire depuis la page d'une couleur (étape Couleur, 05/11) : le même
// éditeur que le formulaire produit, avec le modèle et la couleur déjà remplis. Une fiche
// manquante est créée et publiée par l'API.
export default function AddUnitDialog({
  modelId,
  modelName,
  kind,
  color,
  condition,
  onClose,
}: {
  modelId: number;
  modelName: string;
  kind: ProductKind;
  color: string;
  // null : fenêtre fermée.
  condition: Condition | null;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<VariantDraft | null>(null);
  const [add, state] = useAddUnitMutation();
  // Une fenêtre qui s'ouvre repart d'un exemplaire vide de cet état.
  const current = condition && draft?.condition === condition ? draft : condition ? unitDraft(kind, condition, color) : null;

  function close() {
    setDraft(null);
    state.reset();
    onClose();
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!current) return;
    try {
      await add({ id: modelId, body: { ...variantBody(current), color } }).unwrap();
      close();
    } catch {
      // Le message de l'API s'affiche sous le bouton.
    }
  }

  const title = condition === "refurbished" ? `Ajouter une affaire, ${color}` : `Ajouter un neuf scellé, ${color}`;
  return (
    <EditDialog open={condition !== null} title={title} onClose={close} closeLabel="Annuler">
      {current ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <VariantEditor
            variant={current}
            index={0}
            kind={kind}
            canBeRefurbished={false}
            giftOptions={[]}
            lockedColor={color}
            onChange={setDraft}
            onSuggestSku={() => setDraft({ ...current, sku: suggestSku(modelName, current, 0) })}
          />
          <button type="submit" className="btn btn-primary" disabled={state.isLoading}>
            {state.isLoading ? "Ajout…" : "Ajouter l'exemplaire"}
          </button>
          {state.error ? <p className="field-error">{errorMessage(state.error)}</p> : null}
        </form>
      ) : null}
    </EditDialog>
  );
}
