// Quand deux adresses du MÊME chemin comptent quand même comme deux pages différentes : l'animation
// de page doit alors jouer (elle ne joue sinon que si le chemin change). Deux cas :
//  - la couleur choisie d'une fiche produit (`?couleur=`), qui change l'affiche entière ;
//  - les onglets Retraits et Magasin de Commandes (`?type=`, 17/11) : deux listes, sur la même page.
// Un simple filtre (l'état d'une commande, le canal de l'historique) n'anime pas.
export function isSwitchWithinPath(current: URL, destination: URL): boolean {
  if (destination.pathname !== current.pathname) return false;
  if (destination.pathname.startsWith("/produits/")) {
    return destination.searchParams.get("couleur") !== current.searchParams.get("couleur");
  }
  if (destination.pathname === "/admin/commandes") {
    return destination.searchParams.get("type") !== current.searchParams.get("type");
  }
  return false;
}
