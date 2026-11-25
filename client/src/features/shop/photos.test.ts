import { describe, expect, it } from "vitest";
import { PHOTO_FRAMES, uniformPhoto } from "./photos";

const photo = "https://res.cloudinary.com/nscawk7d/image/upload/v1/dropzone/colors/a.webp";

describe("uniformPhoto", () => {
  it("recadre une photo de couleur dans son cadre", () => {
    expect(uniformPhoto(photo, "color")).toBe(
      "https://res.cloudinary.com/nscawk7d/image/upload/e_trim/c_pad,w_720,h_600,b_transparent/v1/dropzone/colors/a.webp",
    );
  });

  it("recadre une photo de modèle dans son cadre", () => {
    expect(uniformPhoto(photo, "model")).toBe(
      "https://res.cloudinary.com/nscawk7d/image/upload/e_trim/c_pad,w_1200,h_600,b_transparent/v1/dropzone/colors/a.webp",
    );
  });

  it("prend ses dimensions dans PHOTO_FRAMES", () => {
    expect(PHOTO_FRAMES.color).toEqual({ width: 720, height: 600 });
    expect(PHOTO_FRAMES.model).toEqual({ width: 1200, height: 600 });
  });

  it("rend telle quelle une photo déjà recadrée", () => {
    const done = uniformPhoto(photo, "color");
    expect(uniformPhoto(done, "color")).toBe(done);
  });

  it("laisse les icônes locales, les autres hôtes et le vide tels quels", () => {
    expect(uniformPhoto("/products/phone.svg", "color")).toBe("/products/phone.svg");
    expect(uniformPhoto("https://example.com/image/upload/a.webp", "model")).toBe("https://example.com/image/upload/a.webp");
    expect(uniformPhoto("", "model")).toBe("");
  });
});
