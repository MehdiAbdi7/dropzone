// Combien de temps la page doit être immobile avant que les carrousels repartent. Le défilement tactile de la page
// continue par élan après le lever du doigt : 250 ms de calme couvrent la fin de cet élan.
export const PAGE_SCROLL_QUIET_MS = 250;

// Même chose pour le carrousel lui-même : après un grand coup de doigt, l'élan peut durer plus de 2 s sur iPhone, bien
// au-delà de la pause de 2,5 s qui part du lever du doigt. Tant que le carrousel bouge sous l'effet du geste, la
// dérive n'écrit rien ; elle repart 1,2 s après le dernier mouvement.
export const CAROUSEL_SCROLL_QUIET_MS = 1200;

// Le carrousel a-t-il le droit d'avancer seul à cette image ? Une seule règle, lue par la boucle de `useInfiniteCarousel`.
// Écrire `scrollLeft` pendant un geste, un défilement de la page ou l'élan du carrousel (25/11, vidéo de Mehdi sur
// iPhone) bloquait le défilement sous le doigt et faisait clignoter les cartes : on n'avance que quand rien ne bouge.
export function canDrift({
  paused,
  visible,
  reducedMotion,
  touching,
  msSincePageScroll,
  msSinceCarouselScroll,
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
  // Temps écoulé depuis le dernier mouvement du carrousel qui ne vient pas de lui (doigt, molette, élan, flèche).
  msSinceCarouselScroll: number;
}): boolean {
  return (
    !paused &&
    visible &&
    !reducedMotion &&
    !touching &&
    msSincePageScroll >= PAGE_SCROLL_QUIET_MS &&
    msSinceCarouselScroll >= CAROUSEL_SCROLL_QUIET_MS
  );
}

// Un événement de défilement du carrousel vient-il d'un geste, et non d'une écriture du carrousel ? Chaque écriture de
// `scrollLeft` déclenche elle-même un événement de défilement ; on compare la position lue à la dernière position
// écrite : égales (à un pixel près, les navigateurs arrondissent), c'est nous ; sinon, c'est un doigt, la molette,
// l'élan ou une flèche.
export function isUserScroll(currentLeft: number, lastWrittenLeft: number): boolean {
  return Math.abs(currentLeft - lastWrittenLeft) > 1;
}
