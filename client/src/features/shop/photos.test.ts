import { describe, expect, it } from "vitest";
import { PHOTO_FRAMES, uniformPhoto } from "./photos";

const photo = "https://res.cloudinary.com/nscawk7d/image/upload/v1/dropzone/colors/a.webp";

describe("uniformPhoto", () => {
  it("recadre une photo de couleur dans le cadre vertical", () => {
    expect(uniformPhoto(photo, "portrait")).toBe(
      "https://res.cloudinary.com/nscawk7d/image/upload/e_trim/c_pad,w_900,h_1000,b_transparent/v1/dropzone/colors/a.webp",
    );
  });

  it("recadre une photo de modèle dans le cadre horizontal", () => {
    expect(uniformPhoto(photo, "wide")).toBe(
      "https://res.cloudinary.com/nscawk7d/image/upload/e_trim/c_pad,w_1600,h_1000,b_transparent/v1/dropzone/colors/a.webp",
    );
  });

  it("prend ses dimensions dans PHOTO_FRAMES", () => {
    expect(PHOTO_FRAMES.portrait).toEqual({ width: 900, height: 1000 });
    expect(PHOTO_FRAMES.wide).toEqual({ width: 1600, height: 1000 });
  });

  it("rend telle quelle une photo déjà recadrée", () => {
    const done = uniformPhoto(photo, "portrait");
    expect(uniformPhoto(done, "portrait")).toBe(done);
  });

  it("laisse les icônes locales, les autres hôtes et le vide tels quels", () => {
    expect(uniformPhoto("/products/phone.svg", "portrait")).toBe("/products/phone.svg");
    expect(uniformPhoto("https://example.com/image/upload/a.webp", "wide")).toBe("https://example.com/image/upload/a.webp");
    expect(uniformPhoto("", "wide")).toBe("");
  });
});
