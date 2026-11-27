"use client";

import { useState } from "react";
import ProductImage from "@/components/ui/ProductImage";
import { errorMessage } from "@/lib/errors";
import {
  useAddVariantMediaMutation,
  useAddVariantStoryMutation,
  useAdminProductQuery,
  useRemoveVariantMediaMutation,
  useReorderVariantMediaMutation,
} from "@/features/admin/api/productsApi";
import { isInstagramLink } from "@/features/shop/variantMediaRules";
import type { VariantDraft } from "./productDraft";
import { fileProblem, mediaPanelState, PHOTO_MAX_MB, storyLink } from "./variantMedia";

// L'onglet « Photos et vidéo » d'une variante (26/11, demande de Mehdi : la vidéo de la story Instagram d'un téléphone et
// d'autres photos du même exemplaire). Ces médias appartiennent à CETTE variante, pas à la couleur du modèle : ils
// s'ajoutent à la photo de la couleur et disparaissent dès que l'exemplaire est vendu. Les photos sont des fichiers ; la
// vidéo, depuis le 27/11, est le lien de la story Instagram (rien à envoyer : sur le site, la tuile « Story » ouvre Instagram).
// L'ajout part tout de suite, sans attendre « Enregistrer » ; la liste vient de la fiche du produit (relue après chaque ajout).
export default function VariantMediaPanel({ variant, productId }: { variant: VariantDraft; productId?: number }) {
  const { data: product } = useAdminProductQuery(productId ?? 0, { skip: !productId });
  const [add, addState] = useAddVariantMediaMutation();
  const [addStory, storyState] = useAddVariantStoryMutation();
  const [remove, removeState] = useRemoveVariantMediaMutation();
  const [reorder, reorderState] = useReorderVariantMediaMutation();
  const [copied, setCopied] = useState(false);
  // Le lien de la story en cours de saisie, et le refus de la photo choisie (trop lourde, mauvais format).
  const [storyInput, setStoryInput] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  // La variante telle qu'elle est enregistrée : son stock réel est celui que l'API vérifie, pas celui qu'on tape.
  const saved = product?.variants.find((item) => item.id === variant.id);
  const media = saved?.media ?? [];
  const state = mediaPanelState({ id: variant.id, stock: saved?.stock ?? variant.stock }, media);
  const busy = addState.isLoading || storyState.isLoading || removeState.isLoading || reorderState.isLoading;
  const failure = addState.error ?? storyState.error ?? removeState.error ?? reorderState.error;

  function onPhoto(file: File) {
    setProblem(null);
    const refused = fileProblem(file);
    if (refused) {
      setProblem(refused);
      return;
    }
    if (!productId || !variant.id) return;
    add({ productId, variantId: variant.id, file });
  }

  // Le lien est vérifié par l'API (une story, un Reel ou une publication Instagram) ; on vide le champ seulement si c'est accepté.
  async function onStory() {
    setProblem(null);
    if (!productId || !variant.id || !storyInput.trim()) return;
    try {
      await addStory({ productId, variantId: variant.id, url: storyInput.trim() }).unwrap();
      setStoryInput("");
    } catch {
      // L'erreur de l'API s'affiche plus bas (`failure`) ; le lien reste dans le champ pour le corriger.
    }
  }

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
                {isInstagramLink(item.url) ? (
                  // Une story n'a pas d'image à nous : une tuile qui l'ouvre sur Instagram pour la revoir.
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 grid place-items-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-center text-sm font-semibold text-white"
                  >
                    ▶ Story Instagram
                    <span className="block text-xs font-normal opacity-80">Ouvrir ↗</span>
                  </a>
                ) : (
                  <>
                    <ProductImage src={item.posterUrl ?? item.url} alt={item.kind === "video" ? "Vidéo de la variante" : "Photo de la variante"} sizes="160px" />
                    {item.kind === "video" ? (
                      <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">▶ Vidéo</span>
                    ) : null}
                  </>
                )}
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
                    const message = isInstagramLink(item.url)
                      ? "Retirer ce lien ? La story reste sur Instagram, elle ne sera plus proposée sur le site."
                      : "Retirer ce média ? Il sera supprimé de façon définitive.";
                    if (productId && variant.id && window.confirm(message)) {
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
        <label className={`btn btn-secondary btn-small ${state.canAddPhoto && !busy ? "cursor-pointer" : "pointer-events-none opacity-50"}`}>
          {addState.isLoading ? "Envoi…" : "Ajouter une photo"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={!state.canAddPhoto || busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onPhoto(file);
            }}
          />
        </label>
        <p className="text-xs text-ink-muted">Photos de {PHOTO_MAX_MB} Mo au plus (JPEG, PNG ou WebP).</p>
      </div>

      <div className="space-y-2">
        <label className="label" htmlFor={`story-${variant.id ?? "new"}`}>
          Vidéo : lien de la story Instagram
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id={`story-${variant.id ?? "new"}`}
            className="input min-w-0 flex-1 text-sm"
            inputMode="url"
            placeholder="https://www.instagram.com/stories/…"
            value={storyInput}
            disabled={!state.canAddVideo || busy}
            onChange={(event) => setStoryInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void onStory();
              }
            }}
          />
          <button type="button" className="btn btn-secondary btn-small" disabled={!state.canAddVideo || busy || !storyInput.trim()} onClick={() => void onStory()}>
            {storyState.isLoading ? "Ajout…" : "Ajouter la story"}
          </button>
        </div>
        <p className="text-xs text-ink-muted">
          Dans Instagram, ouvre la story, touche l&apos;icône d&apos;envoi puis « Copier le lien », et colle-le ici. Sur le site, la tuile « Story »
          à côté des photos ouvre cette story sur Instagram. Une story disparaît après 24 h : remets-en une et remplace le lien.
        </p>
        {state.reason ? <p className="text-xs text-ink-muted">{state.reason}</p> : null}
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

      {problem ? <p className="field-error">{problem}</p> : failure ? <p className="field-error">{errorMessage(failure)}</p> : null}
    </div>
  );
}
