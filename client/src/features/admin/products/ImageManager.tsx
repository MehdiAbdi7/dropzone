"use client";

import ProductImage from "@/components/ui/ProductImage";
import { errorMessage } from "@/lib/errors";
import { useDeleteImageMutation, useUploadImageMutation, type AdminProduct } from "../adminApi";

const MAX_IMAGES = 6;

// Les photos du produit : envoyées à l'API, qui les range chez Cloudinary.
export default function ImageManager({ product }: { product: AdminProduct }) {
  const [upload, { isLoading, error }] = useUploadImageMutation();
  const [remove] = useDeleteImageMutation();

  return (
    <section aria-labelledby="images" className="card space-y-4 p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-soft text-xs font-bold text-blue-ink">01</span>
        <div>
          <h2 id="images" className="text-xl">Photos du produit ({product.images.length}/{MAX_IMAGES})</h2>
          <p className="mt-1 text-sm text-ink-muted">La première photo est utilisée comme image principale dans la boutique.</p>
        </div>
      </div>
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
