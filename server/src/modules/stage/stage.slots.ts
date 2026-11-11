// Les emplacements du socle de l'accueil (06/11). Les emplacements nommés ont une place de
// départ pensée pour chaque catégorie (dans le front, stageLayout.ts) : le hero a un
// ordinateur, un smartphone, une tablette et 4 accessoires ; le bandeau des affaires, 3.
export const STAGE_SLOTS = {
  hero: ["laptop", "phone", "tablet", "accessory1", "accessory2", "accessory3", "accessory4"],
  deal: ["left", "center", "right"],
} as const;

export type StageName = keyof typeof STAGE_SLOTS;
export const STAGE_NAMES = Object.keys(STAGE_SLOTS) as StageName[];

// Et des emplacements en plus, ajoutés par le gérant (« extra-1 » à « extra-99 », 06/11).
// Une limite par socle garde l'accueil léger : chaque photo est une image à charger.
export const EXTRA_SLOT = /^extra-[1-9]\d?$/;
export const MAX_EXTRA_SLOTS = 20;

// Un socle de plus par catégorie (11/11) : la composition de photos de sa tuile, la même sur
// l'accueil, dans la Boutique et partout où la catégorie s'affiche. Même cadre et mêmes réglages
// que le socle de l'accueil, mais seulement six emplacements « en plus ».
export const CATEGORY_STAGE = /^category-([1-9]\d{0,8})$/;
export const CATEGORY_SLOT = /^extra-[1-6]$/;

export const categoryStageName = (categoryId: number) => `category-${categoryId}`;

// Le numéro de la catégorie d'un nom de socle (« category-3 » → 3), ou null pour hero et deal.
export function categoryIdOf(stage: string): number | null {
  const match = CATEGORY_STAGE.exec(stage);
  return match ? Number(match[1]) : null;
}

export const isStageName = (stage: string) => (STAGE_NAMES as string[]).includes(stage) || CATEGORY_STAGE.test(stage);

export function isSlotOf(stage: string, slot: string) {
  if (CATEGORY_STAGE.test(stage)) {
    return CATEGORY_SLOT.test(slot);
  }
  const named = (STAGE_SLOTS as Record<string, readonly string[]>)[stage];
  return named !== undefined && (named.includes(slot) || EXTRA_SLOT.test(slot));
}
