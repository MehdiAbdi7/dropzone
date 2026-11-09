"use client";

import { MoonIcon } from "./icons";

// Bascule entre le thème clair et le thème sombre (par défaut). Les blocs de
// marque (en-tête, hero, pied de page) restent sombres dans les deux cas.
// Le choix est gardé dans localStorage et relu par ThemeScript au prochain chargement.
export default function ThemeToggle({ withLabel = false }: { withLabel?: boolean }) {
  function toggle() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Stockage indisponible : le thème change seulement pour cette page.
    }
  }

  if (withLabel) {
    return (
      <button type="button" onClick={toggle} className="btn btn-secondary w-full justify-start">
        <MoonIcon />
        Changer de thème
      </button>
    );
  }
  return (
    <button type="button" onClick={toggle} className="icon-btn" aria-label="Changer de thème">
      <MoonIcon />
    </button>
  );
}
