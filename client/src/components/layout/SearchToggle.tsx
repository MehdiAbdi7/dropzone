"use client";

import { useEffect, useRef } from "react";
import { SearchIcon } from "@/components/ui/icons";

// La loupe de l'en-tête. Un <details> s'ouvre sans JavaScript et la form GET vers
// /produits marche sans lui ; le JavaScript ajoute seulement le confort : le curseur
// dans le champ à l'ouverture, la fermeture par Échap ou par un clic ailleurs.
export default function SearchToggle() {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      const details = detailsRef.current;
      if (details?.open && !details.contains(event.target as Node)) {
        details.open = false;
      }
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  return (
    <details
      ref={detailsRef}
      className="search-toggle"
      onToggle={(event) => {
        if (event.currentTarget.open) {
          inputRef.current?.focus();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && detailsRef.current?.open) {
          detailsRef.current.open = false;
          detailsRef.current.querySelector("summary")?.focus();
        }
      }}
    >
      <summary className="icon-btn" aria-label="Chercher un modèle">
        <SearchIcon />
      </summary>
      {/* Le panneau se place sous tout l'en-tête (le <header> est en position relative). */}
      <div className="absolute inset-x-0 top-full border-b border-line bg-bg py-4">
        <form action="/produits" role="search" className="container-page flex gap-2">
          <label htmlFor="header-search" className="sr-only">
            Chercher un modèle
          </label>
          <input
            ref={inputRef}
            id="header-search"
            name="q"
            type="search"
            className="input min-w-0 flex-1"
            placeholder="iPhone 15, Galaxy S24…"
          />
          <button type="submit" className="btn btn-primary">
            Chercher
          </button>
        </form>
      </div>
    </details>
  );
}
