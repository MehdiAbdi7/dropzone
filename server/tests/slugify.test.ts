import { describe, expect, it } from "vitest";
import { slugify } from "../src/utils/slugify.js";

describe("slugify", () => {
  // Ordinateurs portables
  it("met en minuscules et remplace les espaces par un tiret", () => {
    expect(slugify("Ordinateurs portables")).toBe("ordinateurs-portables");
  });

  // Télévisions
  it("retire les accents", () => {
    expect(slugify("Télévisions")).toBe("televisions");
  });
  // Écouteurs & Casques
  it("remplace les symboles et retire les espaces au bord", () => {
    expect(slugify("  Écouteurs & Casques  ")).toBe("ecouteurs-casques");
  });
  // iPhone 15 Pro
  it("garde les chiffres et retire les tirets au bord", () => {
    expect(slugify("--iPhone 15 Pro--")).toBe("iphone-15-pro");
  });
});
