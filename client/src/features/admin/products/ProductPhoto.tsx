"use client";

import ProductImage from "@/components/ui/ProductImage";
import { errorMessage } from "@/lib/errors";
import { useReplaceMainImageMutation } from "@/features/admin/api/productsApi";

// La photo du produit à côté du titre de sa fiche (24/11, demande de Mehdi) : un clic ouvre le choix d'un fichier, et la
// nouvelle photo prend la place de la photo principale (l'ancienne est supprimée, les autres photos ne bougent pas).
// L'envoi part tout de suite, sans « Enregistrer ». Sur téléphone, où il n'y a pas de survol, « Changer » reste affiché.
export default function ProductPhoto({ productId, image, name }: { productId: number; image: string | null; name: string }) {
  const [replace, { isLoading, error }] = useReplaceMainImageMutation();
  return (
    <div className="shrink-0 space-y-1">
      <label className="group relative block size-20 cursor-pointer overflow-hidden rounded-2xl border border-line bg-surface-2 focus-within:ring-2 focus-within:ring-blue sm:size-24">
        {image ? (
          <ProductImage src={image} alt={`Photo principale de ${name}`} sizes="96px" />
        ) : (
          <span className="flex h-full items-center justify-center px-2 text-center text-xs text-ink-muted">Ajouter la photo</span>
        )}
        <span
          className={`absolute inset-x-0 bottom-0 bg-black/65 py-1 text-center text-[11px] font-semibold text-white transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 ${
            isLoading ? "opacity-100" : "opacity-0"
          }`}
        >
          {isLoading ? "Envoi…" : image ? "Changer" : "Ajouter"}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label={`Changer la photo principale de ${name}`}
          disabled={isLoading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) replace({ id: productId, file });
          }}
        />
      </label>
      {error ? (
        <p role="alert" className="field-error max-w-[10rem] text-xs">
          {errorMessage(error)}
        </p>
      ) : null}
    </div>
  );
}
