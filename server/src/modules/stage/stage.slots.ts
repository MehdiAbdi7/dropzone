// Les emplacements du socle de l'accueil (06/11), fixes : le gérant choisit les photos, pas la
// mise en page. Le hero : un ordinateur, un smartphone, une tablette et 4 accessoires ; le
// bandeau des affaires : 3 emplacements. Leur place à l'écran est dans le front (stageLayout.ts).
export const STAGE_SLOTS = {
  hero: ["laptop", "phone", "tablet", "accessory1", "accessory2", "accessory3", "accessory4"],
  deal: ["left", "center", "right"],
} as const;

export type StageName = keyof typeof STAGE_SLOTS;
export const STAGE_NAMES = Object.keys(STAGE_SLOTS) as StageName[];
