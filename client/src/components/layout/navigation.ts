// Les liens de la navigation principale, partagés par l'en-tête et le menu mobile.
// `key` sert à savoir quel lien souligner.
export const NAV_LINKS = [
  { key: "accueil", href: "/", label: "Accueil" },
  { key: "boutique", href: "/boutique", label: "Boutique" },
  { key: "suivi", href: "/suivi", label: "Suivi" },
  { key: "conditions", href: "/conditions-generales-de-vente", label: "Conditions générales de vente" },
  { key: "mentions", href: "/mentions-legales", label: "Mentions légales" },
] as const;

export type NavKey = (typeof NAV_LINKS)[number]["key"];

// Le lien de la page en cours.
export function activeNavKey(pathname: string): NavKey | null {
  if (pathname === "/") {
    return "accueil";
  }
  // Le parcours guidé et les fiches produit font partie de la Boutique.
  if (pathname.startsWith("/boutique") || pathname.startsWith("/produits")) {
    return "boutique";
  }
  if (pathname.startsWith("/suivi")) {
    return "suivi";
  }
  if (pathname === "/conditions-generales-de-vente") {
    return "conditions";
  }
  if (pathname === "/mentions-legales") {
    return "mentions";
  }
  return null;
}
