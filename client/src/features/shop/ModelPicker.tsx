"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { moveIndex } from "./series";

// Le sélecteur de modèles d'une affiche : ‹ nom du modèle › avec « 3 / 16 » dessous.
// Les flèches changent de modèle, le clic sur le nom ouvre la liste de tous les modèles
// (feuille du bas sur téléphone, fenêtre centrée sur ordinateur) pour sauter directement
// à l'un d'eux. C'est PosterSlider qui fait défiler la piste : ici on dit seulement
// « va au modèle i » avec onSelect.
// La liste est posée dans `document.body` (createPortal) : l'affiche a `overflow: hidden` et
// un `backdrop-filter`, qui coupe ou décale tout ce qui est en position fixe à l'intérieur.
export default function ModelPicker({
  names,
  unavailable,
  index,
  onSelect,
  className = "",
}: {
  names: string[];
  unavailable?: boolean[];
  index: number;
  onSelect: (target: number) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const titleId = useId();
  const count = names.length;

  // À l'ouverture, le focus va sur le modèle affiché : le clavier part de là.
  useEffect(() => {
    if (open) {
      listRef.current?.querySelector<HTMLElement>('[aria-current="true"]')?.focus();
    }
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function choose(target: number) {
    onSelect(target);
    close();
  }

  // Échap ferme ; ↑ et ↓ passent d'un modèle à l'autre dans la liste (Tab marche aussi).
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }
    const buttons = Array.from(listRef.current?.querySelectorAll<HTMLElement>("button") ?? []);
    const current = buttons.indexOf(document.activeElement as HTMLElement);
    if (current === -1) {
      return;
    }
    event.preventDefault();
    buttons[moveIndex(current, buttons.length, event.key === "ArrowDown" ? 1 : -1)]?.focus();
  }

  return (
    <div className={`space-y-1.5 px-4 ${className}`}>
      <div className="mx-auto flex max-w-lg items-center gap-2">
        <button
          type="button"
          aria-label={index > 0 ? `Modèle précédent : ${names[index - 1]}` : "Modèle précédent"}
          disabled={index === 0}
          onClick={() => onSelect(moveIndex(index, count, -1))}
          className="poster-step"
        >
          <span aria-hidden="true">‹</span>
        </button>

        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`${names[index]}, choisir un autre modèle`}
          onClick={() => setOpen(true)}
          className="poster-picker-name"
        >
          <span aria-live="polite" className="truncate">
            {names[index]}
          </span>
          <span aria-hidden="true" className="text-xs">
            ▾
          </span>
        </button>

        <button
          type="button"
          aria-label={index < count - 1 ? `Modèle suivant : ${names[index + 1]}` : "Modèle suivant"}
          disabled={index === count - 1}
          onClick={() => onSelect(moveIndex(index, count, 1))}
          className="poster-step"
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>
      <p className="text-center text-xs text-white/70">
        {index + 1} / {count}
      </p>

      {open
        ? createPortal(
            <div className="picker-layer" onKeyDown={onKeyDown}>
              <button type="button" aria-label="Fermer la liste" tabIndex={-1} onClick={close} className="picker-backdrop" />
              <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="picker-panel">
                <div className="picker-head">
                  <h2 id={titleId} className="text-base font-extrabold">
                    Choisir un modèle
                  </h2>
                  <button type="button" aria-label="Fermer" onClick={close} className="poster-step">
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
                <ul ref={listRef} className="picker-list">
                  {names.map((name, i) => (
                    <li key={name}>
                      <button
                        type="button"
                        aria-current={i === index ? "true" : undefined}
                        data-unavailable={unavailable?.[i] ? "true" : undefined}
                        onClick={() => choose(i)}
                        className="picker-item"
                      >
                        <span className="min-w-0 truncate">{name}</span>
                        {unavailable?.[i] ? <span className="picker-tag">Indisponible</span> : null}
                        {i === index ? (
                          <span aria-hidden="true" className="ml-auto">
                            ✓
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
