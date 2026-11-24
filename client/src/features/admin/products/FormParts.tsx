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

// Un groupe de tuiles de la fiche produit (24/11, demande de Mehdi : « trier les boutons pour que tout soit bien
// expliqué ») : un titre, une phrase qui dit à quoi servent les tuiles du groupe, puis les tuiles. Les colonnes
// s'ajustent au nombre de tuiles (une, deux ou trois par rangée) et passent à une seule sur téléphone.
export function SheetSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-base font-bold">{title}</h2>
        <p className="text-sm text-ink-muted">{description}</p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] gap-3">{children}</div>
    </section>
  );
}

// Une tuile de la fiche produit (23/11) : un bouton qui dit ce qu'il ouvre (`description`), résume l'état de cette
// partie (`status`, à la ligne s'il est long : plus rien n'est coupé depuis le 24/11) et ouvre sa fenêtre.
// `state` : « done » rempli (point bleu), « todo » à compléter (point orange), « optional » facultatif (point gris).
export function SheetTile({
  title,
  description,
  status,
  state,
  preview,
  onClick,
}: {
  title: string;
  description: string;
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
      className="card flex min-w-0 items-start gap-3 p-3 text-left transition-[border-color,transform] hover:-translate-y-0.5 hover:border-blue-ink sm:p-4"
    >
      <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-2 text-blue-ink">{preview}</span>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="block font-display text-sm font-bold">{title}</span>
        <span className="block text-xs text-ink-muted">{description}</span>
        <span className="flex items-start gap-1.5 text-xs font-semibold">
          <span aria-hidden="true" className={`mt-1 size-2 shrink-0 rounded-full ${dot}`} />
          <span className="min-w-0 break-words">{status}</span>
        </span>
      </span>
      <span aria-hidden="true" className="mt-1 text-ink-muted">
        ›
      </span>
    </button>
  );
}
