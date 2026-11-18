// Quand deux adresses du MÊME chemin comptent quand même comme deux pages différentes : l'animation
// de page doit alors jouer (elle ne joue sinon que si le chemin change). Deux cas :
//  - la couleur choisie d'une fiche produit (`?couleur=`), qui change l'affiche entière ;
//  - le type de la page Commandes (`?type=`, 17/11) : c'est une autre liste, pas un filtre. Aujourd'hui
//    seul Retraits y vit (Livraisons a son chemin, les ventes au magasin l'Historique) : la règle
//    garde le même comportement si un onglet s'y ajoute.
// Un simple filtre (l'état d'une commande, le canal de l'historique) n'anime pas.
export function isSwitchWithinPath(current: URL, destination: URL): boolean {
  if (destination.pathname !== current.pathname) return false;
  if (destination.pathname.startsWith("/produits/")) {
    return destination.searchParams.get("couleur") !== current.searchParams.get("couleur");
  }
  // Les onglets de l'Historique (Total, Magasin, Livraisons…, 18/11) : chacun change tous les chiffres de la
  // page, donc une petite animation. Changer la période (jour, mois, date) ne touche pas `type` : pas d'animation.
  if (destination.pathname === "/admin/commandes" || destination.pathname === "/admin/historique") {
    return destination.searchParams.get("type") !== current.searchParams.get("type");
  }
  return false;
}
