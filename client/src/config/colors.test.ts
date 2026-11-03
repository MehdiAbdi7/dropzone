import { describe, expect, it } from "vitest";
import { swatchOf } from "./colors";

describe("swatchOf", () => {
  it("donne une teinte aux couleurs connues, iPhone 18 Pro compris", () => {
    expect(swatchOf("Bordeaux")).toMatch(/^#[0-9a-f]{6}$/i);
    expect(swatchOf("Glacier")).toMatch(/^#[0-9a-f]{6}$/i);
    expect(swatchOf("Titane naturel")).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("ne devine pas la teinte d'une couleur inconnue", () => {
    expect(swatchOf("Inconnue")).toBeNull();
  });
});
