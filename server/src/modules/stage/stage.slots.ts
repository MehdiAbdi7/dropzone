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

export const isSlotOf = (stage: StageName, slot: string) =>
  (STAGE_SLOTS[stage] as readonly string[]).includes(slot) || EXTRA_SLOT.test(slot);
