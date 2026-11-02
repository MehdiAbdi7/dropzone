"use client";

// Bascule entre le thème sombre (celui de la marque) et le thème clair.
// Le choix est gardé dans localStorage et relu par ThemeScript au prochain chargement.
export default function ThemeToggle() {
  function toggle() {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Stockage indisponible : le thème change seulement pour cette page.
    }
  }

  return (
    <button type="button" onClick={toggle} className="btn btn-secondary btn-small" aria-label="Changer de thème">
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z" />
      </svg>
    </button>
  );
}
