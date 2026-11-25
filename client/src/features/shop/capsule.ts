// L'enveloppe collante de la capsule de filtres, partagée par la page Accessoires et les pages
// d'appareils pour que la capsule se colle au même endroit des deux côtés.
// Pourquoi un `top` et pas `top-0` : l'en-tête du site est lui aussi collé en haut (`sticky top-0
// z-30`). Une capsule à `top-0` se glissait dessous et disparaissait au défilement. L'en-tête
// mesure `min-h-16` (4 rem) plus 1 px de bordure ; on laisse 8 px d'air en dessous.
export const CAPSULE_WRAP = "sticky top-[calc(4rem+1px+8px)] z-20 -mx-4 px-4 md:mx-0 md:px-0";
