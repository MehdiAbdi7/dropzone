import { describe, expect, it } from "vitest";
import { dealDevices, heroDevices, type StagePhotos } from "./stageLayout";

const empty: StagePhotos = {
  hero: { laptop: null, phone: null, tablet: null, accessory1: null, accessory2: null, accessory3: null, accessory4: null },
  deal: { left: null, center: null, right: null },
};

// Le socle de l'accueil (06/11) : les photos du gérant, chacune à sa place fixe.
describe("heroDevices", () => {
  it("garde les illustrations de départ tant qu'aucune photo n'est envoyée", () => {
    expect(heroDevices(empty).map((device) => device.src)).toEqual([
      "/products/charger.svg",
      "/products/watch.svg",
      "/products/phone.svg",
      "/products/earbuds.svg",
    ]);
  });

  it("passe à la disposition des photos dès la première, sans les emplacements vides", () => {
    const devices = heroDevices({ ...empty, hero: { ...empty.hero, laptop: "https://x/pc.webp", accessory2: "https://x/coque.webp" } });
    expect(devices.map((device) => [device.slot, device.src])).toEqual([
      ["laptop", "https://x/pc.webp"],
      ["accessory2", "https://x/coque.webp"],
    ]);
  });

  it("place les accessoires devant les appareils", () => {
    const full = Object.fromEntries(Object.keys(empty.hero).map((slot) => [slot, `https://x/${slot}.webp`]));
    const devices = heroDevices({ ...empty, hero: full as StagePhotos["hero"] });
    const z = (slot: string) => Number(/z-(\d+)/.exec(devices.find((d) => d.slot === slot)!.position)?.[1] ?? 0);
    expect(z("accessory1")).toBeGreaterThan(z("phone"));
    expect(z("phone")).toBeGreaterThan(z("laptop"));
  });
});

describe("dealDevices", () => {
  it("remplace chaque illustration par la photo de son emplacement", () => {
    const devices = dealDevices({ ...empty, deal: { left: null, center: "https://x/tel.webp", right: null } });
    expect(devices.map((device) => device.src)).toEqual(["/products/charger.svg", "https://x/tel.webp", "/products/earbuds.svg"]);
  });
});
