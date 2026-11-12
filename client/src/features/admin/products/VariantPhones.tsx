"use client";

import { useScreenSizesQuery } from "@/features/admin/api/catalogApi";
import CompatibleModelsPicker from "./CompatibleModelsPicker";
import type { VariantDraft } from "./productDraft";

const SIZE = "Taille de l'écran";

// Les téléphones d'une variante d'accessoire (refonte du 12/11) : pour un verre, ceux de sa
// taille d'écran. La fenêtre de la Boutique y cherche le téléphone du client. Le bouton remplit
// la liste avec les téléphones du catalogue qui ont cette taille (lue dans leur fiche) ; le
// gérant retire ensuite ceux dont la forme ne va pas (bords courbes) ou en ajoute.
export default function VariantPhones({
  variant,
  id,
  onChange,
}: {
  variant: VariantDraft;
  id: string;
  onChange: (ids: number[]) => void;
}) {
  const { data: sizes = [] } = useScreenSizesQuery();
  const size = variant.options[SIZE];
  const sameSize = sizes.find((one) => one.size === size)?.models ?? [];
  const missing = sameSize.filter((model) => !variant.compatibleModelIds.includes(model.id));

  return (
    <div className="space-y-3 rounded-lg border border-line p-3">
      <p className="label">Téléphones compatibles avec cette variante</p>
      {size && missing.length > 0 ? (
        <button
          type="button"
          className="btn btn-secondary btn-small"
          onClick={() => onChange([...variant.compatibleModelIds, ...missing.map((model) => model.id)])}
        >
          Ajouter les téléphones de {size} ({missing.length})
        </button>
      ) : null}
      <CompatibleModelsPicker id={id} value={variant.compatibleModelIds} onChange={onChange} />
    </div>
  );
}
