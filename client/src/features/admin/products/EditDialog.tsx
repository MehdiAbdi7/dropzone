"use client";

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

// Une fenêtre au centre de l'écran pour modifier une partie de la fiche produit.
// L'élément natif <dialog> (showModal) gère le fond, le focus et la touche Échap.
// Les champs restent dans le <form> de la page : « Terminé » ferme seulement la fenêtre,
// l'enregistrement se fait toujours avec le bouton du bas de la page.
export default function EditDialog({
  open,
  title,
  onClose,
  toolbar,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  // Une zone collée sous le titre, qui ne défile pas avec la liste (recherche, ajout).
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  // Entrée dans un champ enverrait tout le formulaire : dans la fenêtre, elle ne fait rien
  // (sauf dans une zone de texte, où elle va à la ligne).
  function onKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
      event.preventDefault();
    }
  }

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onKeyDown={onKeyDown}
      aria-label={title}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(48rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-line bg-surface p-0 text-ink backdrop:bg-black/70"
    >
      <div className="sticky top-0 z-10 border-b border-line bg-surface">
        <div className="flex items-center justify-between gap-3 px-5 py-3">
          <h2 className="text-lg">{title}</h2>
          <button type="button" className="btn btn-primary btn-small" onClick={onClose}>
            Terminé
          </button>
        </div>
        {open && toolbar ? <div className="space-y-2 px-5 pb-3">{toolbar}</div> : null}
      </div>
      {/* Le contenu n'est monté que fenêtre ouverte : la page reste légère. */}
      <div className="space-y-4 p-5">{open ? children : null}</div>
    </dialog>
  );
}
