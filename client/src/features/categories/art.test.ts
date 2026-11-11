import { describe, expect, it } from "vitest";
import type { Category } from "@/types/api";
import { categoryDevices, defaultBox, KIND_ICONS } from "./art";

const category = (extra: Partial<Category> = {}): Category => ({
  id: 1,
  name: "Smartphones",
  slug: "smartphones",
  kind: "phone",
  productCount: 3,
  brands: [],
  hasUnbranded: false,
  featured: false,
  minPrice: null,
  photos: [],
  fallbackImage: null,
  ...extra,
});
const photo = (slot: string, place: Partial<{ x: number; y: number; w: number; z: number }> = {}) => ({
  slot,
  url: `https://res.cloudinary.com/nscawk7d/image/upload/v1/dropzone/stage/${slot}.webp`,
  x: null,
  y: null,
  w: null,
  z: null,
  ...place,
});

// 11/11 : la composition d'une catégorie est la même partout (accueil, Boutique, recherche).
// Réglée dans Personnalisation ; sans elle, la photo du dernier produit ; sans elle, l'icône.
describe("categoryDevices", () => {
  it("reprend la composition réglée, photo par photo, avec le vide coupé", () => {
    const devices = categoryDevices(
      category({ photos: [photo("extra-1", { x: 10, y: 5, w: 40, z: 2 }), photo("extra-2", { x: 50, y: 5, w: 40, z: 1 })] }),
    );
    expect(devices.map((device) => device.slot)).toEqual(["extra-1", "extra-2"]);
    expect(devices[0].src).toBe("https://res.cloudinary.com/nscawk7d/image/upload/e_trim/v1/dropzone/stage/extra-1.webp");
    expect(devices[0].box).toEqual({ x: 10, y: 5, w: 40, z: 2 });
  });

  it("place à leur départ les photos que le gérant n'a pas bougées", () => {
    const devices = categoryDevices(category({ photos: [photo("extra-1"), photo("extra-2")] }));
    expect(devices.map((device) => device.box)).toEqual([defaultBox(0, 2), defaultBox(1, 2)]);
  });

  it("garde les places réglées et ne place à leur départ que les autres", () => {
    const devices = categoryDevices(category({ photos: [photo("extra-1", { x: 1, y: 2, w: 30, z: 4 }), photo("extra-2")] }));
    expect(devices[0].box).toEqual({ x: 1, y: 2, w: 30, z: 4 });
    expect(devices[1].box).toEqual(defaultBox(1, 2));
  });

  it("prend la photo du produit le plus récent quand rien n'est réglé", () => {
    const devices = categoryDevices(category({ fallbackImage: "https://x/iphone.webp" }));
    expect(devices).toHaveLength(1);
    expect(devices[0].src).toBe("https://x/iphone.webp");
    expect(devices[0].box).toEqual(defaultBox(0, 1));
  });

  it("finit sur l'icône de la sorte de catégorie : jamais une tuile vide", () => {
    expect(categoryDevices(category({ kind: "laptop" })).map((device) => device.src)).toEqual([KIND_ICONS.laptop]);
    expect(categoryDevices(category({ kind: "accessory" })).map((device) => device.src)).toEqual([KIND_ICONS.accessory]);
  });

  it("préfère la composition à la photo de secours", () => {
    const devices = categoryDevices(category({ photos: [photo("extra-1")], fallbackImage: "https://x/iphone.webp" }));
    expect(devices.map((device) => device.slot)).toEqual(["extra-1"]);
  });
});

describe("defaultBox", () => {
  it("garde toutes les photos dans le cadre, de 1 à 6", () => {
    for (let count = 1; count <= 6; count++) {
      for (let index = 0; index < count; index++) {
        const { x, y, w } = defaultBox(index, count);
        expect(x, `${index + 1}/${count}`).toBeGreaterThanOrEqual(0);
        expect(x + w, `${index + 1}/${count}`).toBeLessThanOrEqual(100);
        expect(y).toBeGreaterThanOrEqual(0);
        // La hauteur de la case carrée fait w × 5/4 en % de la hauteur du cadre.
        expect(y + (w * 5) / 4, `${index + 1}/${count}`).toBeLessThanOrEqual(100);
      }
    }
  });

  it("pose une photo seule au centre, plus grande qu'une photo d'un groupe", () => {
    const alone = defaultBox(0, 1);
    expect(alone.x + alone.w / 2).toBeCloseTo(50, 0);
    expect(alone.w).toBeGreaterThan(defaultBox(0, 3).w);
  });

  it("met la photo du milieu devant, pour trois photos", () => {
    const [left, middle, right] = [0, 1, 2].map((index) => defaultBox(index, 3));
    expect(middle.z).toBeGreaterThan(left.z);
    expect(middle.z).toBeGreaterThan(right.z);
  });

  it("rend des places distinctes d'une photo à l'autre", () => {
    const boxes = [0, 1, 2, 3].map((index) => defaultBox(index, 4));
    expect(new Set(boxes.map((box) => box.x)).size).toBe(4);
  });
});
