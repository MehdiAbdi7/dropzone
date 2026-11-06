"use client";

import { useId, useRef, type ReactNode } from "react";

// Une confirmation avant une action qui ne se défait pas (supprimer, annuler).
// L'élément natif <dialog> gère seul le focus, la touche Échap et le fond.
export default function ConfirmDialog({
  trigger,
  title,
  children,
  confirmLabel,
  onConfirm,
}: {
  trigger: string;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  // Un id par boîte : une liste peut en avoir plusieurs (un « Supprimer » par accessoire).
  const titleId = useId();

  return (
    <>
      <button type="button" className="btn btn-danger" onClick={() => dialog.current?.showModal()}>
        {trigger}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-6 text-ink backdrop:bg-black/70"
      >
        <h2 id={titleId} className="text-xl">
          {title}
        </h2>
        <div className="mt-3 text-ink-muted">{children}</div>
        <form method="dialog" className="mt-6 flex justify-end gap-3">
          <button type="submit" className="btn btn-secondary">
            Garder
          </button>
          <button type="submit" className="btn btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </form>
      </dialog>
    </>
  );
}
