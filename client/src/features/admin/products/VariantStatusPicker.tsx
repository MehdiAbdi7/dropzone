import type { ProductStatus } from "@/types/api";

// Publiée ou Brouillon, dans le pied de la fenêtre d'une variante (23/11) : sur une ligne (25/11). Une variante en
// brouillon n'est vendue nulle part (ni la boutique, ni le comptoir, ni la commande par téléphone) : seul ce cas
// a une explication, la publiée n'en a pas besoin.
export default function VariantStatusPicker({ status, onChange }: { status: ProductStatus; onChange: (status: ProductStatus) => void }) {
  return (
    <fieldset className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <legend className="float-left mr-1 text-sm font-semibold">Statut</legend>
        {(["published", "draft"] as const).map((option) => (
          <button key={option} type="button" className="chip" aria-pressed={status === option} onClick={() => onChange(option)}>
            {option === "published" ? "Publiée" : "Brouillon"}
          </button>
        ))}
      </div>
      {status === "draft" ? (
        <p className="text-xs text-ink-muted">Invisible dans la boutique et impossible à vendre, même au comptoir.</p>
      ) : null}
    </fieldset>
  );
}
