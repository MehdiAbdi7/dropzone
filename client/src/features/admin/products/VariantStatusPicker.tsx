import type { ProductStatus } from "@/types/api";

// Publiée ou Brouillon, dans la fenêtre d'une variante (23/11). Une variante en brouillon n'est vendue nulle part :
// ni la boutique, ni le comptoir, ni la commande par téléphone.
export default function VariantStatusPicker({ status, onChange }: { status: ProductStatus; onChange: (status: ProductStatus) => void }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold">Statut de cette variante</legend>
      <div className="flex flex-wrap gap-2">
        {(["published", "draft"] as const).map((option) => (
          <button key={option} type="button" className="chip" aria-pressed={status === option} onClick={() => onChange(option)}>
            {option === "published" ? "Publiée" : "Brouillon"}
          </button>
        ))}
      </div>
      <p className="text-xs text-ink-muted">
        {status === "published"
          ? "Visible dans la boutique et vendable partout."
          : "Invisible dans la boutique et impossible à vendre, même au comptoir, tant qu'elle n'est pas publiée."}
      </p>
    </fieldset>
  );
}
