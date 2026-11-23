import type { ReactNode } from "react";

// Les petits éléments d'affichage du formulaire produit, sans état ni logique.

export function SectionHeading({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-line pb-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-soft text-xs font-bold text-blue-ink">
        {number}
      </span>
      <div>
        <h3 className="font-display font-bold">{title}</h3>
        <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
      </div>
    </div>
  );
}

// Une tuile de la fiche produit (23/11) : un bouton compact qui résume une partie de la fiche et ouvre sa fenêtre.
// `state` : « done » rempli (point bleu), « todo » à compléter (point orange), « optional » facultatif (point gris).
export function SheetTile({
  title,
  status,
  state,
  preview,
  onClick,
}: {
  title: string;
  status: string;
  state: "done" | "todo" | "optional";
  preview: ReactNode;
  onClick: () => void;
}) {
  const dot = state === "done" ? "bg-blue" : state === "todo" ? "bg-amber" : "bg-line";
  return (
    <button
      type="button"
      onClick={onClick}
      className="card flex min-w-0 items-center gap-3 p-3 text-left transition-[border-color,transform] hover:-translate-y-0.5 hover:border-blue-ink"
    >
      <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-2 text-blue-ink">{preview}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-sm font-bold">{title}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
          <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${dot}`} />
          <span className="truncate">{status}</span>
        </span>
      </span>
      <span aria-hidden="true" className="text-ink-muted">
        ›
      </span>
    </button>
  );
}
