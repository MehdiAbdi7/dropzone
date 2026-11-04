// Les adresses du catalogue d'avant le 03/11 : « reconditionne » est devenu « affaire »,
// et l'ancienne page Affaires (`offre=affaire`) a rejoint la liste des affaires. Renvoie
// la nouvelle adresse, avec les autres filtres, ou null si l'adresse est déjà à jour :
// aucun lien partagé ne tombe sur une page vide.
export function legacyCatalogRedirect(params: URLSearchParams): string | null {
  if (params.get("condition") !== "reconditionne" && params.get("offre") !== "affaire") {
    return null;
  }
  const next = new URLSearchParams(params);
  next.delete("offre");
  next.set("condition", "affaire");
  return `/produits?${next.toString()}`;
}

// Depuis le 04/11, la page de tous les produits n'existe plus (décision de Mehdi) : on
// choisit dans la Boutique, catégorie puis marque. /produits ne montre une liste que pour
// les affaires, les résultats de la recherche et les accessoires d'un modèle (lien d'une
// fiche d'accessoire). Toute autre adresse renvoie vers la Boutique, ou vers la page de
// sa catégorie et de sa marque : aucun lien partagé ne tombe sur une page disparue.
export function catalogRedirect(params: URLSearchParams): string | null {
  const legacy = legacyCatalogRedirect(params);
  if (legacy) {
    return legacy;
  }
  if (params.get("q") || params.get("condition") === "affaire" || params.get("model")) {
    return null;
  }
  const category = params.get("category");
  if (!category) {
    return "/boutique";
  }
  const brand = params.get("brand");
  return `/boutique/${encodeURIComponent(category)}${brand ? `/${encodeURIComponent(brand)}` : ""}`;
}
