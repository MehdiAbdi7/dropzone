"use client";

import { useState } from "react";
import ProductImage from "@/components/ui/ProductImage";
import { errorMessage } from "@/lib/errors";
import {
  useAddVariantMediaMutation,
  useAdminProductQuery,
  useRemoveVariantMediaMutation,
  useReorderVariantMediaMutation,
} from "@/features/admin/api/productsApi";
import type { VariantDraft } from "./productDraft";
import { mediaPanelState, storyLink } from "./variantMedia";

// L'onglet « Photos et vidéo » d'une variante (26/11, demande de Mehdi : la vidéo de la story Instagram d'un téléphone et
// d'autres photos du même exemplaire). Ces médias appartiennent à CETTE variante, pas à la couleur du modèle : ils
// s'ajoutent à la photo de la couleur et disparaissent dès que l'exemplaire est vendu. L'envoi part tout de suite, sans
// attendre « Enregistrer » ; la liste vient de la fiche du produit (relue après chaque envoi).
export default function VariantMediaPanel({ variant, productId }: { variant: VariantDraft; productId?: number }) {
  const { data: product } = useAdminProductQuery(productId ?? 0, { skip: !productId });
  const [add, addState] = useAddVariantMediaMutation();
  const [remove, removeState] = useRemoveVariantMediaMutation();
  const [reorder, reorderState] = useReorderVariantMediaMutation();
  const [copied, setCopied] = useState(false);

  // La variante telle qu'elle est enregistrée : son stock réel est celui que l'API vérifie, pas celui qu'on tape.
  const saved = product?.variants.find((item) => item.id === variant.id);
  const media = saved?.media ?? [];
  const state = mediaPanelState({ id: variant.id, stock: saved?.stock ?? variant.stock }, media);
  const busy = addState.isLoading || removeState.isLoading || reorderState.isLoading;
  const failure = addState.error ?? removeState.error ?? reorderState.error;
  const color = variant.options.Couleur;
  const link = saved && product && color ? storyLink({ slug: product.slug, color, condition: variant.condition, sku: variant.sku }) : null;

  function move(index: number, delta: -1 | 1) {
    if (!productId || !variant.id) return;
    const ids = media.map((item) => item.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    reorder({ productId, variantId: variant.id, ids });
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${link}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Les photos et la vidéo de cet exemplaire, en plus de la photo de la couleur. Elles sont supprimées automatiquement dès qu&apos;il est
        vendu. {state.photos} photo{state.photos > 1 ? "s" : ""}, {state.videos} vidéo.
      </p>

      {media.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {media.map((item, index) => (
            <li key={item.id} className="space-y-2">
              <div className="relative aspect-square overflow-hidden rounded-lg border border-line bg-surface-2">
                <ProductImage src={item.posterUrl ?? item.url} alt={item.kind === "video" ? "Vidéo de la variante" : "Photo de la variante"} sizes="160px" />
                {item.kind === "video" ? (
                  <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">▶ Vidéo</span>
                ) : null}
              </div>
              <div className="flex gap-1">
                <button type="button" className="btn btn-outline btn-small" aria-label="Avancer d'une place" disabled={busy || index === 0} onClick={() => move(index, -1)}>
                  ←
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-small"
                  aria-label="Reculer d'une place"
                  disabled={busy || index === media.length - 1}
                  onClick={() => move(index, 1)}
                >
                  →
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-small"
                  disabled={busy}
                  onClick={() => {
                    if (productId && variant.id && window.confirm("Retirer ce média ? Il sera supprimé de façon définitive.")) {
                      remove({ productId, variantId: variant.id, mediaId: item.id });
                    }
                  }}
                >
                  Retirer
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="space-y-2">
        <label className={`btn btn-secondary btn-small ${state.canAdd && !busy ? "cursor-pointer" : "pointer-events-none opacity-50"}`}>
          {addState.isLoading ? "Envoi…" : "Ajouter une photo ou la vidéo"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
            className="sr-only"
            disabled={!state.canAdd || busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file && productId && variant.id) {
                add({ productId, variantId: variant.id, file });
              }
            }}
          />
        </label>
        {state.reason ? <p className="text-xs text-ink-muted">{state.reason}</p> : null}
        <p className="text-xs text-ink-muted">Photos de 5 Mo au plus, vidéo de 50 Mo au plus (MP4, MOV ou WebM).</p>
      </div>

      {link ? (
        <div className="space-y-2">
          <p className="label">Lien du bouton « Acheter » de la story</p>
          <div className="flex flex-wrap items-center gap-2">
            <input readOnly className="input min-w-0 flex-1 text-xs" value={`${typeof window === "undefined" ? "" : window.location.origin}${link}`} aria-label="Lien de la story" />
            <button type="button" className="btn btn-secondary btn-small" onClick={copyLink}>
              {copied ? "Copié" : "Copier le lien"}
            </button>
          </div>
          <p className="text-xs text-ink-muted">Il mène au téléphone, dans cette couleur, avec les photos et la vidéo de cet exemplaire.</p>
        </div>
      ) : null}

      {failure ? <p className="field-error">{errorMessage(failure)}</p> : null}
    </div>
  );
}
