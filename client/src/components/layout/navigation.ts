// Les liens de la navigation principale, partagés par l'en-tête et le menu mobile.
// `key` sert à savoir quel lien souligner.
export const NAV_LINKS = [
  { key: "accueil", href: "/", label: "Accueil" },
  { key: "boutique", href: "/produits", label: "Boutique" },
  { key: "categories", href: "/#categories", label: "Catégories" },
  { key: "reconditionnes", href: "/produits?condition=reconditionne", label: "Reconditionnés" },
  { key: "affaires", href: "/produits?offre=affaire", label: "Affaires" },
  { key: "suivi", href: "/suivi", label: "Suivi" },
] as const;

export type NavKey = (typeof NAV_LINKS)[number]["key"];

// Le lien de la page en cours. Reconditionnés et Affaires sont des filtres du
// catalogue : on regarde donc aussi l'adresse après le « ? ».
export function activeNavKey(pathname: string, params: URLSearchParams): NavKey | null {
  if (pathname === "/") {
    return "accueil";
  }
  if (pathname === "/produits") {
    if (params.get("offre") === "affaire") {
      return "affaires";
    }
    if (params.get("condition") === "reconditionne") {
      return "reconditionnes";
    }
  }
  if (pathname.startsWith("/produits")) {
    return "boutique";
  }
  if (pathname.startsWith("/suivi")) {
    return "suivi";
  }
  return null;
}
