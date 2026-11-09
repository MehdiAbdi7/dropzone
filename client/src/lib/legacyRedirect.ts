// Les anciennes adresses Affaires vont maintenant au parcours de sélection de la Boutique.
export function legacyCatalogRedirect(params: URLSearchParams): string | null {
  if (params.get("condition") !== "reconditionne" && params.get("offre") !== "affaire") {
    return null;
  }
  return "/boutique";
}

// La liste des affaires a été remplacée par le parcours de sélection de la Boutique.
// /produits reste disponible pour la recherche et les accessoires d'un modèle.
export function catalogRedirect(params: URLSearchParams): string | null {
  const legacy = legacyCatalogRedirect(params);
  if (legacy) {
    return legacy;
  }
  if (params.has("q") || params.get("model")) {
    return null;
  }
  if (params.get("condition") === "affaire") {
    return "/boutique";
  }
  const category = params.get("category");
  if (!category) {
    return "/boutique";
  }
  const brand = params.get("brand");
  return `/boutique/${encodeURIComponent(category)}${brand ? `/${encodeURIComponent(brand)}` : ""}`;
}
