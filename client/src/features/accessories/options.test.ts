import { describe, expect, it } from "vitest";
import type { Variant } from "@/types/api";
import { findVariant, isPossible, phonesOf, sizeForPhone } from "./options";

const phone = (name: string) => ({ brand: name.startsWith("iPhone") ? "Apple" : "Samsung", name, slug: name.toLowerCase().replace(/ /g, "-") });

const variant = (options: Record<string, string>, over: Partial<Variant> = {}): Variant => ({
  sku: Object.values(options).join("-"),
  options,
  price: 1000,
  stock: 10,
  condition: "new",
  grade: null,
  batteryHealth: null,
  replacedParts: [],
  compatibleParts: [],
  defects: [],
  limitations: [],
  withBox: null,
  details: null,
  gifts: [],
  ...over,
});

// Le pack Anker : Lightning seulement en 20 et 30 W.
const pack = [
  variant({ Câble: "Lightning", Puissance: "20 W" }),
  variant({ Câble: "USB-C", Puissance: "20 W" }),
  variant({ Câble: "USB-C", Puissance: "65 W" }, { stock: 0 }),
];

const glass = [
  variant({ "Taille de l'écran": "6,1 pouces" }, { compatibleModels: [phone("iPhone 15"), phone("Galaxy S23")] }),
  variant({ "Taille de l'écran": "6,7 pouces" }, { compatibleModels: [phone("iPhone 15 Pro Max"), phone("iPhone 16 Plus")] }),
  // Le gérant a coché l'iPhone 15 dans deux tailles.
  variant({ "Taille de l'écran": "6,9 pouces" }, { compatibleModels: [phone("iPhone 15")] }),
];

describe("findVariant", () => {
  it("rend la variante dont toutes les options sont choisies", () => {
    expect(findVariant(pack, { Câble: "USB-C", Puissance: "20 W" })?.sku).toBe("USB-C-20 W");
  });

  it("rend undefined tant qu'une option manque", () => {
    expect(findVariant(pack, { Câble: "USB-C" })).toBeUndefined();
  });

  it("rend une variante épuisée : la fenêtre la montre en rupture", () => {
    expect(findVariant(pack, { Câble: "USB-C", Puissance: "65 W" })).toMatchObject({ stock: 0 });
  });
});

describe("isPossible", () => {
  it("refuse une valeur qu'aucune variante n'a avec les choix déjà faits", () => {
    expect(isPossible(pack, "Puissance", "65 W", { Câble: "Lightning" })).toBe(false);
  });

  it("accepte une valeur possible, même épuisée", () => {
    expect(isPossible(pack, "Puissance", "65 W", { Câble: "USB-C" })).toBe(true);
  });

  it("ne tient pas compte du choix déjà fait pour la même option", () => {
    expect(isPossible(pack, "Puissance", "20 W", { Puissance: "65 W" })).toBe(true);
  });
});

describe("phonesOf", () => {
  it("rend chaque téléphone une fois, avec la première taille qui le contient, du plus récent au plus ancien", () => {
    expect(phonesOf(glass)).toEqual([
      { name: "iPhone 16 Plus", slug: "iphone-16-plus", size: "6,7 pouces" },
      { name: "iPhone 15 Pro Max", slug: "iphone-15-pro-max", size: "6,7 pouces" },
      { name: "iPhone 15", slug: "iphone-15", size: "6,1 pouces" },
      { name: "Galaxy S23", slug: "galaxy-s23", size: "6,1 pouces" },
    ]);
  });
});

describe("sizeForPhone", () => {
  it("rend la taille du téléphone", () => {
    expect(sizeForPhone(glass, "iphone-15-pro-max")).toBe("6,7 pouces");
  });

  it("rend la première taille pour un téléphone coché dans deux tailles", () => {
    expect(sizeForPhone(glass, "iphone-15")).toBe("6,1 pouces");
  });

  it("rend null pour un téléphone sans verre", () => {
    expect(sizeForPhone(glass, "galaxy-s24-ultra")).toBeNull();
  });
});
