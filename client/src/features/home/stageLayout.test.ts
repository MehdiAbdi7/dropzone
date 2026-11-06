import { describe, expect, it } from "vitest";
import {
  clampBox,
  dealDevices,
  extraBox,
  HERO_SLOTS,
  nextExtraSlot,
  slotLabel,
  heroDevices,
  moveBox,
  reorder,
  resizeBox,
  stagePhoto,
  type StagePhotos,
} from "./stageLayout";

const empty: StagePhotos = {
  hero: { laptop: null, phone: null, tablet: null, accessory1: null, accessory2: null, accessory3: null, accessory4: null },
  deal: { left: null, center: null, right: null },
};
const photo = (url: string, place: Partial<{ x: number; y: number; w: number; z: number }> = {}) => ({
  url,
  x: null,
  y: null,
  w: null,
  z: null,
  ...place,
});

// 06/11 : une photo détourée garde souvent du vide transparent autour de l'objet, qui le
// rapetisse sur le socle. Cloudinary le coupe (`e_trim`) à l'affichage.
describe("stagePhoto", () => {
  it("coupe le vide transparent autour d'une photo Cloudinary", () => {
    expect(stagePhoto("https://res.cloudinary.com/nscawk7d/image/upload/v1/dropzone/stage/a.webp")).toBe(
      "https://res.cloudinary.com/nscawk7d/image/upload/e_trim/v1/dropzone/stage/a.webp",
    );
  });

  it("laisse les dessins et les autres adresses tels quels", () => {
    expect(stagePhoto("/products/phone.svg")).toBe("/products/phone.svg");
    expect(stagePhoto("https://x/a.webp")).toBe("https://x/a.webp");
  });
});

// Le socle de l'accueil (06/11) : les photos du gérant, à leur place de départ ou à celle
// qu'il a choisie à la souris.
describe("heroDevices", () => {
  it("garde les illustrations de départ tant qu'aucune photo n'est envoyée", () => {
    expect(heroDevices(empty).map((device) => device.src)).toEqual([
      "/products/charger.svg",
      "/products/watch.svg",
      "/products/phone.svg",
      "/products/earbuds.svg",
    ]);
  });

  it("passe aux photos dès la première, sans les emplacements vides, à leur place de départ", () => {
    const devices = heroDevices({ ...empty, hero: { ...empty.hero, laptop: photo("https://x/pc.webp") } });
    expect(devices).toEqual([{ slot: "laptop", src: "https://x/pc.webp", box: { x: 16, y: 25, w: 68, z: 1 } }]);
  });

  it("prend la place choisie par le gérant quand elle est enregistrée", () => {
    const devices = heroDevices({ ...empty, hero: { ...empty.hero, phone: photo("https://x/tel.webp", { x: 10, y: 20, w: 30, z: 9 }) } });
    expect(devices[0].box).toEqual({ x: 10, y: 20, w: 30, z: 9 });
  });
});

// Les emplacements en plus (06/11) : « extra-1 », « extra-2 »… ajoutés par le gérant.
describe("emplacements en plus", () => {
  it("les ajoute après les emplacements nommés, dans l'ordre de leur numéro", () => {
    const devices = heroDevices({
      ...empty,
      hero: { ...empty.hero, phone: photo("https://x/tel.webp"), "extra-10": photo("https://x/b.webp"), "extra-2": photo("https://x/a.webp") },
    });
    expect(devices.map((device) => device.slot)).toEqual(["phone", "extra-2", "extra-10"]);
  });

  it("donne à chacun une place de départ décalée, pour ne pas les empiler", () => {
    expect(extraBox(1)).not.toEqual(extraBox(2));
    expect(clampBox(extraBox(7))).toEqual(extraBox(7));
  });

  it("existe aussi dans le bandeau des affaires", () => {
    const devices = dealDevices({ ...empty, deal: { ...empty.deal, "extra-1": photo("https://x/a.webp") } });
    expect(devices.map((device) => device.slot)).toEqual(["left", "center", "right", "extra-1"]);
  });

  it("propose le premier numéro libre et un nom lisible", () => {
    expect(nextExtraSlot({ ...empty.hero, "extra-1": photo("a"), "extra-3": photo("b") })).toBe("extra-2");
    expect(nextExtraSlot(empty.hero)).toBe("extra-1");
    expect(slotLabel("extra-4")).toBe("Article en plus 4");
    expect(slotLabel("phone")).toBe("Smartphone");
  });
});

describe("dealDevices", () => {
  it("remplace chaque illustration par la photo de son emplacement", () => {
    const devices = dealDevices({ ...empty, deal: { left: null, center: photo("https://x/tel.webp"), right: null } });
    expect(devices.map((device) => device.src)).toEqual(["/products/charger.svg", "https://x/tel.webp", "/products/earbuds.svg"]);
  });
});

// L'éditeur du back-office : une photo reste dans la largeur du cadre, son bas sous 75 %.
describe("clampBox", () => {
  it("garde la photo dans le cadre", () => {
    expect(clampBox({ x: -10, y: -5, w: 30, z: 1 })).toEqual({ x: 0, y: 0, w: 30, z: 1 });
    expect(clampBox({ x: 90, y: 80, w: 40, z: 1 })).toEqual({ x: 60, y: 75, w: 40, z: 1 });
  });

  it("laisse chaque place de départ telle quelle", () => {
    HERO_SLOTS.forEach(({ box }) => expect(clampBox(box)).toEqual(box));
  });

  it("borne la taille entre 8 % et 80 % de la largeur", () => {
    expect(clampBox({ x: 0, y: 0, w: 2, z: 1 }).w).toBe(8);
    expect(clampBox({ x: 0, y: 0, w: 95, z: 1 }).w).toBe(80);
  });
});

describe("moveBox / resizeBox", () => {
  it("déplace de la distance glissée (vers le haut = y plus grand)", () => {
    expect(moveBox({ x: 10, y: 10, w: 20, z: 1 }, 5, 3)).toEqual({ x: 15, y: 13, w: 20, z: 1 });
  });

  it("agrandit autour du centre du bas de la photo, sans sortir du cadre", () => {
    expect(resizeBox({ x: 40, y: 10, w: 20, z: 1 }, 30)).toEqual({ x: 35, y: 10, w: 30, z: 1 });
    expect(resizeBox({ x: 0, y: 10, w: 20, z: 1 }, 30)).toEqual({ x: 0, y: 10, w: 30, z: 1 });
  });
});

describe("reorder", () => {
  const boxes = { a: { x: 0, y: 0, w: 20, z: 1 }, b: { x: 0, y: 0, w: 20, z: 2 }, c: { x: 0, y: 0, w: 20, z: 3 } };

  it("met une photo devant toutes les autres, ou derrière", () => {
    const front = reorder(boxes, "a", "front");
    expect(Object.entries(front).sort((p, q) => p[1].z - q[1].z).map(([slot]) => slot)).toEqual(["b", "c", "a"]);
    const back = reorder(boxes, "c", "back");
    expect(Object.entries(back).sort((p, q) => p[1].z - q[1].z).map(([slot]) => slot)).toEqual(["c", "a", "b"]);
  });

  it("numérote de 1 à n, sans trous ni doublons", () => {
    expect(Object.values(reorder(boxes, "b", "front")).map((box) => box.z).sort()).toEqual([1, 2, 3]);
  });
});
