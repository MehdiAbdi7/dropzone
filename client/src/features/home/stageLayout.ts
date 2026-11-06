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

// Cases agrandies le 06/11 (« tu as mis les trucs trop petits ») : les appareils prennent
// presque toute la largeur du socle et se chevauchent un peu, comme sur une affiche.
export const HERO_SLOTS: { slot: keyof StagePhotos["hero"]; label: string; position: string }[] = [
  { slot: "laptop", label: "Ordinateur portable (au fond, au centre)", position: "left-[16%] bottom-[25%] w-[68%] z-0" },
  { slot: "tablet", label: "Tablette (à gauche)", position: "left-[0%] bottom-[17%] w-[42%] z-10" },
  { slot: "phone", label: "Smartphone (à droite)", position: "right-[0%] bottom-[16%] w-[42%] z-20" },
  // Le rang de devant suit la courbe du bord du socle : plus bas au centre qu'aux côtés.
  { slot: "accessory1", label: "Accessoire 1 (devant, à gauche)", position: "left-[3%] bottom-[9%] w-[25%] z-30" },
  { slot: "accessory2", label: "Accessoire 2 (devant)", position: "left-[26%] bottom-[4%] w-[25%] z-30" },
  { slot: "accessory3", label: "Accessoire 3 (devant)", position: "left-[49%] bottom-[4%] w-[25%] z-30" },
  { slot: "accessory4", label: "Accessoire 4 (devant, à droite)", position: "left-[72%] bottom-[9%] w-[25%] z-30" },
];

// Une photo du gérant, sans le vide transparent qui l'entoure souvent après un détourage :
// Cloudinary le coupe à l'affichage (`e_trim`), l'objet remplit alors sa case. Les dessins
// et les autres adresses restent tels quels.
export function stagePhoto(url: string): string {
  return url.startsWith("https://res.cloudinary.com/") ? url.replace("/image/upload/", "/image/upload/e_trim/") : url;
}

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
    return src ? [{ slot, src: stagePhoto(src), position }] : [];
  });
  return filled.length > 0 ? filled : HERO_DEFAULT;
}

// Le bandeau des affaires : 3 emplacements, chacun garde son illustration tant qu'il est vide.
export function dealDevices(photos: StagePhotos | null): StageDevice[] {
  return DEAL_SLOTS.map(({ slot, position, fallback }) => {
    const photo = photos?.deal[slot];
    return { slot, src: photo ? stagePhoto(photo) : fallback, position };
  });
}
