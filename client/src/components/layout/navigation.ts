// Les liens de la navigation principale, partagés par l'en-tête et le menu mobile.
// `key` sert à savoir quel lien souligner.
export const NAV_LINKS = [
  { key: "accueil", href: "/", label: "Accueil" },
  { key: "boutique", href: "/boutique", label: "Boutique" },
  { key: "affaires", href: "/produits?condition=affaire", label: "Affaires" },
  { key: "suivi", href: "/suivi", label: "Suivi" },
] as const;

export type NavKey = (typeof NAV_LINKS)[number]["key"];

// Le lien de la page en cours. Affaires est un filtre du catalogue : on
// regarde donc aussi l'adresse après le « ? ».
export function activeNavKey(
  pathname: string,
  params: URLSearchParams,
): NavKey | null {
  if (pathname === "/") {
    return "accueil";
  }
  if (pathname === "/produits") {
    if (params.get("condition") === "affaire") {
      return "affaires";
    }
  }
  // Le parcours guidé et les fiches produit font partie de la Boutique.
  if (pathname.startsWith("/boutique") || pathname.startsWith("/produits")) {
    return "boutique";
  }
  if (pathname.startsWith("/suivi")) {
    return "suivi";
  }
  return null;
}
