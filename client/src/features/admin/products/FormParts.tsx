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

// Une carte de la page : son titre, un résumé de ce qui est rempli, et le bouton qui ouvre la fenêtre.
export function SummaryCard({
  step,
  title,
  description,
  status,
  complete,
  action,
  onEdit,
  className = "",
  children,
}: {
  step: string;
  title: string;
  description: string;
  status: string;
  complete: boolean;
  action: string;
  onEdit: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`card flex flex-col gap-3 p-4 sm:p-5 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-soft text-xs font-bold text-blue-ink">{step}</span>
          <div className="min-w-0">
            <h2 className="text-lg">{title}</h2>
            <p className="text-sm text-ink-muted">{description}</p>
          </div>
        </div>
        <button type="button" className="btn btn-secondary btn-small" onClick={onEdit}>
          {action}
        </button>
      </div>
      <div className="flex items-center gap-2 border-t border-line pt-3">
        <span
          className={`size-2 rounded-full ${status === "Facultatif" ? "bg-line" : complete ? "bg-blue" : "bg-amber"}`}
          aria-hidden="true"
        />
        <span className="text-xs font-semibold text-ink-muted">{status}</span>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function SummaryLine({ label, value, missing = false }: { label: string; value: string; missing?: boolean }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-ink-muted">{label} :</dt>
      <dd className={`min-w-0 truncate font-semibold ${missing ? "text-red" : ""}`}>{value}</dd>
    </div>
  );
}
