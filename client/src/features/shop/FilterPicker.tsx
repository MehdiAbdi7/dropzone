"use client";

import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import BrandLogo from "@/components/ui/BrandLogo";
import { CheckIcon, ChevronDownIcon, CloseIcon } from "@/components/ui/icons";
import type { PickerOption } from "./filterOptions";
import { moveIndex } from "./series";

// Un bouton de filtre de la capsule de la Boutique (« Type », « Marque ») et sa liste (25/11,
// demande de Mehdi : des listes plutôt que des puces). Sur ordinateur, la liste s'ouvre sous le
// bouton ; sur téléphone, c'est une feuille du bas, comme le sélecteur de modèles des séries
// (ModelPicker). Les lignes sont les mêmes des deux côtés : coche devant le choix, logo, nom,
// nombre à droite.
export default function FilterPicker({
  label,
  emptyText,
  options,
  value,
  onChange,
}: {
  label: string;
  // Le texte du bouton quand rien n'est choisi, sur ordinateur (« Tous », « Toutes »). Sur
  // téléphone le bouton dit son nom : l'étiquette est cachée par manque de place.
  emptyText: string;
  options: PickerOption[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  // Choisi à l'ouverture : la page ne change pas de forme pendant que la liste est ouverte.
  const [asSheet, setAsSheet] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const chosen = options.find((option) => option.value === value);

  function openList() {
    setAsSheet(!window.matchMedia("(min-width: 640px)").matches);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  // Un choix change toute la liste en dessous, souvent pour une plus courte : sans remonter, la
  // page restait scrollée en bas et le pied de page remplissait l'écran (remarque de Mehdi, 25/11).
  // On remonte donc en haut à chaque choix, sans animation : le contenu a déjà changé.
  function choose(next: string | null) {
    onChange(next);
    close();
    window.scrollTo({ top: 0 });
  }

  // À l'ouverture, le focus va sur le choix actuel : le clavier part de là.
  useEffect(() => {
    if (open) {
      listRef.current?.querySelector<HTMLElement>('[aria-current="true"]')?.focus();
    }
  }, [open]);

  // Sur ordinateur, un clic en dehors ferme la liste (la feuille a son fond cliquable).
  useEffect(() => {
    if (!open || asSheet) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, asSheet]);

  // Échap ferme ; ↑ et ↓ passent d'une ligne à l'autre.
  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }
    const rows = Array.from(listRef.current?.querySelectorAll<HTMLElement>("button") ?? []);
    const current = rows.indexOf(document.activeElement as HTMLElement);
    if (current === -1) {
      return;
    }
    event.preventDefault();
    rows[moveIndex(current, rows.length, event.key === "ArrowDown" ? 1 : -1)]?.focus();
  }

  const list = (
    <div ref={listRef} role="listbox" aria-label={label} className="filter-list">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value ?? "tous"}
            type="button"
            role="option"
            aria-selected={selected}
            aria-current={selected ? "true" : undefined}
            onClick={() => choose(option.value)}
            className={`filter-option ${option.value === null ? "filter-option-all" : ""}`}
          >
            <span className="filter-check">{selected ? <CheckIcon size={16} /> : null}</span>
            <BrandLogo url={option.logoUrl} size={16} width={option.logoUrl?.startsWith("/brands/") ? 34 : 16} />
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
            <span className="filter-detail">{option.detail}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div ref={rootRef} className="filter-picker" onKeyDown={asSheet ? undefined : onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        data-active={value !== null ? "" : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        className="filter-trigger"
      >
        <span className="filter-label">{label}</span>
        <span className="flex min-w-0 items-center gap-2">
          <BrandLogo url={chosen?.logoUrl ?? null} size={16} width={chosen?.logoUrl?.startsWith("/brands/") ? 34 : 16} />
          <span className="truncate">{chosen && value !== null ? chosen.label : <span className="max-sm:hidden">{emptyText}</span>}</span>
          {value === null ? <span className="sm:hidden">{label}</span> : null}
        </span>
        <ChevronDownIcon size={16} className="filter-chevron" />
      </button>

      {open && !asSheet ? <div className="filter-pop">{list}</div> : null}

      {open && asSheet
        ? createPortal(
            <div className="picker-layer" onKeyDown={onKeyDown}>
              <button type="button" aria-label="Fermer la liste" tabIndex={-1} onClick={close} className="picker-backdrop" />
              <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="picker-panel is-themed">
                <div className="picker-head">
                  <h2 id={titleId} className="text-base font-extrabold">
                    {label}
                  </h2>
                  <button type="button" aria-label="Fermer" onClick={close} className="icon-btn">
                    <CloseIcon size={18} />
                  </button>
                </div>
                <div className="picker-list">{list}</div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
