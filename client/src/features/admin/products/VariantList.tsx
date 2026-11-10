import { CONDITION_LABELS } from "@/config/catalog";
import { formatPrice } from "@/lib/format";
import { invalidWarranty, missingBox, missingPartOrigins, type VariantDraft } from "./productDraft";

// L'étape 05 de la page : une carte par variante, avec ce qui reste à compléter avant l'envoi.
export default function VariantList({
  variants,
  canAddRefurbished,
  onAdd,
  onEdit,
}: {
  variants: VariantDraft[];
  canAddRefurbished: boolean;
  onAdd: (condition: "new" | "refurbished") => void;
  onEdit: (key: string) => void;
}) {
  return (
    <section id="variantes" aria-labelledby="step-variants" className="card scroll-mt-6 space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold tracking-wider text-blue-ink">ÉTAPE 05</p>
          <h2 id="step-variants" className="text-xl">Stock et variantes ({variants.length})</h2>
          <p className="mt-1 text-sm text-ink-muted">Chaque combinaison de modèle, couleur ou stockage a son prix et son stock.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary btn-small" onClick={() => onAdd("new")}>
            + Neuf scellé
          </button>
          {canAddRefurbished ? (
            <button type="button" className="btn btn-secondary btn-small" onClick={() => onAdd("refurbished")}>
              + Affaire
            </button>
          ) : null}
        </div>
      </div>
      {variants.length === 0 ? (
        <p className="text-sm text-ink-muted">Aucune variante : ajoute un neuf scellé ou une affaire.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {variants.map((variant) => {
            const options = Object.values(variant.options).filter(Boolean).join(" · ");
            // Ce qui bloquera l'envoi, signalé sur la ligne avant même d'enregistrer.
            const problems = [
              missingBox(variant) ? "boîte à choisir" : null,
              missingPartOrigins(variant).length > 0 ? "origine des pièces" : null,
              invalidWarranty(variant) ? "garantie" : null,
              !variant.price ? "prix" : null,
            ].filter(Boolean);
            return (
              <li key={variant.key} className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface-2/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span
                      className={`badge ${variant.condition === "refurbished" ? "bg-red-soft text-red" : "bg-blue-soft text-blue-ink"}`}
                    >
                      {CONDITION_LABELS[variant.condition]}
                    </span>
                    <p className="mt-2 truncate font-semibold">{options || "Options à choisir"}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-muted">
                      {variant.sku || "SKU à écrire"}
                      {variant.reference ? ` · Réf. ${variant.reference}` : ""}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">{variant.price ? formatPrice(Number(variant.price)) : "Prix à saisir"}</p>
                    <p className="text-ink-muted">Stock : {variant.stock || 0}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                  {problems.length > 0 ? (
                    <span className="badge bg-[#ffb547] text-black">À compléter : {problems.join(", ")}</span>
                  ) : (
                    <span className="text-xs font-semibold text-ink-muted">Variante prête</span>
                  )}
                  <button type="button" className="btn btn-secondary btn-small ml-auto" onClick={() => onEdit(variant.key)}>
                    Modifier la variante
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
