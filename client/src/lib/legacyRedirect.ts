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

// Refonte du 12/11 : les accessoires n'ont plus d'étape marque ni d'affiches, mais une page à
// filtres. Les anciennes adresses (`/boutique/accessoires/chargeurs`, ou `/coques/iphone` pour
// les affiches d'une marque) mènent au même choix sur la nouvelle page.
export function accessoryRedirect(category: string, type: string, maker?: string): string {
  const params = new URLSearchParams({ type });
  if (maker) params.set("marque", maker);
  return `/boutique/${category}?${params.toString()}`;
}

// Les 30 anciens verres (un par série) et 37 anciennes coques ont été remplacés (12/11) : une
// ancienne fiche partagée mène à la nouvelle page de son type plutôt qu'à une page introuvable.
export function retiredProductRedirect(slug: string): string | null {
  if (slug.startsWith("verre-trempe-")) return "/boutique/accessoires?type=incassable-ecran";
  if (slug.startsWith("coque-")) return "/boutique/accessoires?type=coques";
  return null;
}
