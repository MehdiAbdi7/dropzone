import type { ReactNode } from "react";

// Une carte de la page Personnalisation (11/11, demande de Mehdi : une page courte). Elle
// montre l'aperçu et l'état d'un réglage en une ligne ; toute la carte est un bouton qui ouvre
// sa fenêtre (EditDialog), où se trouvent l'éditeur et les photos. L'éditeur n'est monté que
// fenêtre ouverte : la page reste légère, même avec beaucoup de catégories.
export default function PersonalizationCard({
  title,
  meta,
  badge,
  preview,
  onOpen,
}: {
  title: string;
  // L'état en une ligne : « 3 photos », « Photo du dernier produit »…
  meta: string;
  badge?: string;
  preview: ReactNode;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="card group flex w-full items-center gap-4 p-3 text-left transition-[border-color,transform] hover:-translate-y-0.5"
    >
      <span className="relative block aspect-[5/4] w-24 shrink-0 overflow-hidden rounded-lg bg-surface-2 sm:w-28">{preview}</span>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="block truncate font-display font-bold group-hover:text-blue-ink">{title}</span>
        <span className="block text-sm text-ink-muted">{meta}</span>
        {badge ? (
          <span className="inline-block rounded-full bg-blue-soft px-2.5 py-0.5 text-xs font-bold text-blue-ink">{badge}</span>
        ) : null}
      </span>
      <span className="btn btn-outline btn-small shrink-0 max-sm:hidden">Modifier</span>
    </button>
  );
}
