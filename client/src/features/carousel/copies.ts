// Les trois copies d'un carrousel en boucle (useInfiniteCarousel) : la liste est rendue trois
// fois, et le défilement reste dans celle du milieu.
export const COPIES = [0, 1, 2] as const;

// Ce que chaque copie expose. Seule la copie du milieu compte pour le clavier et les lecteurs
// d'écran (la liste n'est lue qu'une fois) ; les deux autres en sont retirées :
//  - `hidden` : aria-hidden sur la copie ;
//  - `tabIndex: -1` : ses liens ne se prennent pas avec Tab.
//
// PAS `inert` (bug du 13/11) : inert coupe aussi les clics et les touchers. Or les copies
// latérales passent réellement à l'écran : quand la boucle recule d'une copie, tout ce qu'on voit
// appartient à la copie 0 pendant une quarantaine de secondes. Avec inert, cliquer ne faisait rien.
export function copyAccess(copy: number): { hidden: boolean; tabIndex: -1 | undefined } {
  const isMain = copy === 1;
  return { hidden: !isMain, tabIndex: isMain ? undefined : -1 };
}
