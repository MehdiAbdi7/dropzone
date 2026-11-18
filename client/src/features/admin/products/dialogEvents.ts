// L'événement `close` d'une fenêtre <dialog> : React le fait remonter dans l'arbre des composants, donc une
// fenêtre ouverte DANS une autre (le Détail depuis la recherche de produit) fermerait aussi sa fenêtre
// parente. Une fenêtre ne réagit qu'à sa propre fermeture : l'événement doit être arrivé sur elle-même.
export function isOwnCloseEvent(event: { target: unknown; currentTarget: unknown }): boolean {
  return event.target === event.currentTarget;
}
