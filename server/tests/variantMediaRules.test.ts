import { describe, expect, it } from "vitest";
import {
  checkMediaRoom,
  isInstagramUrl,
  MAX_PHOTOS,
  mediaKindOf,
  PHOTO_MAX_BYTES,
  posterOf,
  instagramUrlOf,
} from "../src/modules/products/variantMedia.rules.js";

const room = { stock: 1, kind: "photo" as const, photos: 0, videos: 0, size: 1000 };

describe("mediaKindOf", () => {
  it("reconnaît les photos et refuse le reste (la vidéo est un lien, plus un fichier)", () => {
    expect(mediaKindOf("image/webp")).toBe("photo");
    expect(mediaKindOf("image/jpeg")).toBe("photo");
    expect(mediaKindOf("video/mp4")).toBeNull();
    expect(mediaKindOf("application/pdf")).toBeNull();
  });
});

// Le lien d'un Reel collé par le gérant (27/11) : ramené à une adresse propre, ou refusé.
describe("instagramUrlOf", () => {
  const clean = "https://www.instagram.com/reel/DgPh-ZvNLX9/";

  it("garde l'adresse propre d'un Reel", () => {
    expect(instagramUrlOf("https://www.instagram.com/reel/DgPh-ZvNLX9/")).toBe(clean);
    expect(instagramUrlOf("  https://www.instagram.com/reel/DgPh-ZvNLX9  ")).toBe(clean);
  });

  it("jette le suivi (igsh, utm) pour que deux liens du même Reel donnent la même adresse", () => {
    expect(instagramUrlOf("https://www.instagram.com/reel/DgPh-ZvNLX9/?igsh=abc123&utm_source=ig_web_copy_link")).toBe(clean);
    expect(instagramUrlOf("https://instagram.com/reel/DgPh-ZvNLX9/#x")).toBe(clean);
  });

  it("accepte un lien copié depuis un profil (compte devant), « reels » et une publication", () => {
    expect(instagramUrlOf("https://www.instagram.com/dropzone.officiel/reel/DgPh-ZvNLX9/")).toBe(clean);
    expect(instagramUrlOf("https://www.instagram.com/reels/DgPh-ZvNLX9/")).toBe(clean);
    expect(instagramUrlOf("https://www.instagram.com/p/DgPh-ZvNLX9/")).toBe("https://www.instagram.com/p/DgPh-ZvNLX9/");
  });

  // La vidéo d'un téléphone est sa story (27/11) : un clic sur la tuile « Story » ouvre l'adresse sur Instagram.
  it("accepte une story, et une story « À la une », sans le suivi", () => {
    const story = "https://www.instagram.com/stories/dropzone.officiel/3812345678901234567/";
    expect(instagramUrlOf(story)).toBe(story);
    expect(instagramUrlOf(`${story}?igsh=abc123&utm_source=ig_story_item_share`)).toBe(story);
    expect(instagramUrlOf("https://instagram.com/stories/dropzone.officiel/3812345678901234567")).toBe(story);
    expect(instagramUrlOf("https://www.instagram.com/stories/highlights/17912345678901234/")).toBe(
      "https://www.instagram.com/stories/highlights/17912345678901234/",
    );
  });

  it("refuse une story sans numéro, un profil, un autre site et ce qui n'est pas une adresse", () => {
    expect(instagramUrlOf("https://www.instagram.com/stories/dropzone.officiel/")).toBeNull();
    expect(instagramUrlOf("https://www.instagram.com/dropzone.officiel/")).toBeNull();
    expect(instagramUrlOf("https://www.youtube.com/stories/dropzone.officiel/3812345678901234567/")).toBeNull();
    expect(instagramUrlOf("https://www.youtube.com/reel/DgPh-ZvNLX9/")).toBeNull();
    expect(instagramUrlOf("https://instagram.com.evil.example/reel/DgPh-ZvNLX9/")).toBeNull();
    expect(instagramUrlOf("http://www.instagram.com/reel/DgPh-ZvNLX9/")).toBeNull();
    expect(instagramUrlOf("javascript:alert(1)")).toBeNull();
    expect(instagramUrlOf("pas un lien")).toBeNull();
    expect(instagramUrlOf("")).toBeNull();
  });
});

describe("isInstagramUrl et posterOf", () => {
  it("un Reel n'a pas de vignette à nous : Instagram affiche la sienne", () => {
    expect(isInstagramUrl("https://www.instagram.com/reel/DgPh-ZvNLX9/")).toBe(true);
    expect(posterOf("https://www.instagram.com/reel/DgPh-ZvNLX9/")).toBeNull();
  });

  it("une ancienne vidéo Cloudinary garde sa vignette (l'extension remplacée par .jpg)", () => {
    expect(isInstagramUrl("https://res.cloudinary.com/x/video/upload/v1/dropzone/variants/a.mp4")).toBe(false);
    expect(posterOf("https://res.cloudinary.com/x/video/upload/v1/dropzone/variants/a.mp4")).toBe(
      "https://res.cloudinary.com/x/video/upload/v1/dropzone/variants/a.jpg",
    );
  });
});

describe("checkMediaRoom", () => {
  it("accepte un cas normal", () => {
    expect(checkMediaRoom(room)).toEqual({ ok: true });
  });

  it("refuse une variante épuisée (ses médias ne seraient jamais supprimés)", () => {
    expect(checkMediaRoom({ ...room, stock: 0 })).toMatchObject({ ok: false, status: 409 });
  });

  it("refuse une photo de trop", () => {
    expect(checkMediaRoom({ ...room, photos: MAX_PHOTOS })).toMatchObject({ ok: false, status: 409 });
    expect(checkMediaRoom({ ...room, photos: MAX_PHOTOS - 1 })).toEqual({ ok: true });
  });

  it("refuse une deuxième vidéo", () => {
    expect(checkMediaRoom({ ...room, kind: "video", videos: 1 })).toMatchObject({ ok: false, status: 409 });
  });

  it("refuse une photo au-dessus de sa taille maximale ; un lien de Reel n'a pas de taille", () => {
    expect(checkMediaRoom({ ...room, size: PHOTO_MAX_BYTES + 1 })).toMatchObject({ ok: false, status: 413 });
    expect(checkMediaRoom({ ...room, kind: "video", size: 0 })).toEqual({ ok: true });
  });
});
