// L'apparition des sections de l'accueil au défilement (11/11), sans React.

// Une section se cache au chargement seulement si son haut est sous le bas de l'écran (à 90 % de
// sa hauteur) : elle attend qu'on l'atteigne. Celles qu'on voit déjà (le hero), ou qu'on a déjà
// dépassées (retour sur la page, lien vers une ancre), restent visibles : elles ne clignotent pas.
export function startsHidden(top: number, viewportHeight: number): boolean {
  return top >= viewportHeight * 0.9;
}
