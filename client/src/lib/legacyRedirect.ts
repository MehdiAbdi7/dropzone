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
