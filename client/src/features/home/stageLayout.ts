// La disposition du socle de l'accueil, sans React (06/11). Le gérant envoie une photo sans
// fond par emplacement (back-office › Accueil) ; la place de chaque emplacement est fixe,
// pensée pour voir chaque catégorie : l'ordinateur au fond, la tablette à gauche, le
// smartphone à droite, et 4 accessoires en rang devant, sur le bord du socle.
// Les positions sont en pourcentages du cadre (5:4), donc justes à toutes les tailles.

export type StagePhotos = {
  hero: Record<"laptop" | "phone" | "tablet" | "accessory1" | "accessory2" | "accessory3" | "accessory4", string | null>;
  deal: Record<"left" | "center" | "right", string | null>;
};

export type StageDevice = { slot: string; src: string; position: string };

export const HERO_SLOTS: { slot: keyof StagePhotos["hero"]; label: string; position: string }[] = [
  { slot: "laptop", label: "Ordinateur portable (au fond, au centre)", position: "left-[22%] bottom-[24%] w-[56%] z-0" },
  { slot: "tablet", label: "Tablette (à gauche)", position: "left-[5%] bottom-[18%] w-[34%] z-10" },
  { slot: "phone", label: "Smartphone (à droite)", position: "right-[6%] bottom-[17%] w-[30%] z-20" },
  { slot: "accessory1", label: "Accessoire 1 (devant, à gauche)", position: "left-[10%] bottom-[2%] w-[18%] z-30" },
  { slot: "accessory2", label: "Accessoire 2 (devant)", position: "left-[30%] bottom-[0%] w-[18%] z-30" },
  { slot: "accessory3", label: "Accessoire 3 (devant)", position: "left-[52%] bottom-[0%] w-[18%] z-30" },
  { slot: "accessory4", label: "Accessoire 4 (devant, à droite)", position: "left-[72%] bottom-[2%] w-[18%] z-30" },
];

// Les illustrations de départ du hero, gardées tant qu'aucune photo n'est envoyée : un socle
// à moitié vide ferait moins bien que les dessins.
const HERO_DEFAULT: StageDevice[] = [
  { slot: "charger", src: "/products/charger.svg", position: "left-[19%] bottom-[33%] w-[22%]" },
  { slot: "watch", src: "/products/watch.svg", position: "left-[4%] bottom-[16%] w-[30%] z-10" },
  { slot: "phone", src: "/products/phone.svg", position: "left-[26%] bottom-[15%] w-[48%] z-20" },
  { slot: "earbuds", src: "/products/earbuds.svg", position: "right-[4%] bottom-[16%] w-[30%] z-10" },
];

export const DEAL_SLOTS: { slot: keyof StagePhotos["deal"]; label: string; position: string; fallback: string }[] = [
  { slot: "left", label: "À gauche", position: "left-[6%] bottom-[16%] w-[30%] z-10", fallback: "/products/charger.svg" },
  { slot: "center", label: "Au centre (le plus grand)", position: "left-[26%] bottom-[15%] w-[48%] z-20", fallback: "/products/phone.svg" },
  { slot: "right", label: "À droite", position: "right-[6%] bottom-[16%] w-[30%] z-10", fallback: "/products/earbuds.svg" },
];

export function heroDevices(photos: StagePhotos | null): StageDevice[] {
  const filled = HERO_SLOTS.flatMap(({ slot, position }) => {
    const src = photos?.hero[slot];
    return src ? [{ slot, src, position }] : [];
  });
  return filled.length > 0 ? filled : HERO_DEFAULT;
}

// Le bandeau des affaires : 3 emplacements, chacun garde son illustration tant qu'il est vide.
export function dealDevices(photos: StagePhotos | null): StageDevice[] {
  return DEAL_SLOTS.map(({ slot, position, fallback }) => ({ slot, src: photos?.deal[slot] ?? fallback, position }));
}
