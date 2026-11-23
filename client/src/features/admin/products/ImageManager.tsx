"use client";

import ProductImage from "@/components/ui/ProductImage";
import { errorMessage } from "@/lib/errors";
import { useDeleteImageMutation, useUploadImageMutation, type AdminProduct } from "@/features/admin/api/productsApi";

export const MAX_IMAGES = 6;

// Les photos du produit : envoyées à l'API, qui les range chez Cloudinary. Depuis le 23/11, c'est le contenu de la
// fenêtre « Photos » de la fiche (la tuile en haut de la page l'ouvre).
export default function ImageManager({ product }: { product: AdminProduct }) {
  const [upload, { isLoading, error }] = useUploadImageMutation();
  const [remove] = useDeleteImageMutation();

  return (
    <section aria-label="Photos du produit" className="space-y-4">
      <p className="text-sm text-ink-muted">
        {product.images.length}/{MAX_IMAGES} photos. La première est l&apos;image principale dans la boutique.
      </p>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {product.images.map((image) => (
          <li key={image.id} className="space-y-1">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-surface-2">
              <ProductImage src={image.url} alt="" sizes="120px" />
            </div>
            <button
              type="button"
              className="text-xs text-red underline"
              onClick={() => remove({ id: product.id, imageId: image.id })}
            >
              Retirer
            </button>
          </li>
        ))}
      </ul>
      {product.images.length < MAX_IMAGES ? (
        <label className="block">
          <span className="label">Ajouter une photo (JPEG, PNG ou WebP, 5 Mo au maximum)</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={isLoading}
            className="block text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue file:px-3 file:py-2 file:font-semibold file:text-on-brand"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                upload({ id: product.id, file });
                event.target.value = "";
              }
            }}
          />
        </label>
      ) : null}
      {isLoading ? <p className="text-sm text-ink-muted">Envoi…</p> : null}
      {error ? <p className="field-error">{errorMessage(error)}</p> : null}
    </section>
  );
}
