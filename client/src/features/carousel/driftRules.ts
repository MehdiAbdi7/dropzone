// Combien de temps la page doit être immobile avant que les carrousels repartent. Le défilement tactile de la page
// continue par élan après le lever du doigt : 250 ms de calme couvrent la fin de cet élan.
export const PAGE_SCROLL_QUIET_MS = 250;

// Le carrousel a-t-il le droit d'avancer seul à cette image ? Une seule règle, lue par la boucle de `useInfiniteCarousel`.
// Écrire `scrollLeft` pendant un geste ou un défilement de la page (25/11, vidéo de Mehdi sur iPhone) bloquait le
// défilement vertical sous le doigt et faisait clignoter les cartes : on n'avance que quand rien ne bouge.
export function canDrift({
  paused,
  visible,
  reducedMotion,
  touching,
  msSincePageScroll,
}: {
  // Pause du carrousel : survol de la souris, geste sur lui, flèche.
  paused: boolean;
  // Le carrousel est à l'écran.
  visible: boolean;
  // La personne a demandé moins d'animations.
  reducedMotion: boolean;
  // Un doigt est posé sur l'écran, n'importe où (la page peut être en train de défiler).
  touching: boolean;
  // Temps écoulé depuis le dernier défilement de la page.
  msSincePageScroll: number;
}): boolean {
  return !paused && visible && !reducedMotion && !touching && msSincePageScroll >= PAGE_SCROLL_QUIET_MS;
}
