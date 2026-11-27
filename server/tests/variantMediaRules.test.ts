import { describe, expect, it } from "vitest";
import {
  checkMediaRoom,
  isReelUrl,
  MAX_PHOTOS,
  mediaKindOf,
  PHOTO_MAX_BYTES,
  posterOf,
  reelUrlOf,
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
describe("reelUrlOf", () => {
  const clean = "https://www.instagram.com/reel/DgPh-ZvNLX9/";

  it("garde l'adresse propre d'un Reel", () => {
    expect(reelUrlOf("https://www.instagram.com/reel/DgPh-ZvNLX9/")).toBe(clean);
    expect(reelUrlOf("  https://www.instagram.com/reel/DgPh-ZvNLX9  ")).toBe(clean);
  });

  it("jette le suivi (igsh, utm) pour que deux liens du même Reel donnent la même adresse", () => {
    expect(reelUrlOf("https://www.instagram.com/reel/DgPh-ZvNLX9/?igsh=abc123&utm_source=ig_web_copy_link")).toBe(clean);
    expect(reelUrlOf("https://instagram.com/reel/DgPh-ZvNLX9/#x")).toBe(clean);
  });

  it("accepte un lien copié depuis un profil (compte devant), « reels » et une publication", () => {
    expect(reelUrlOf("https://www.instagram.com/dropzone.officiel/reel/DgPh-ZvNLX9/")).toBe(clean);
    expect(reelUrlOf("https://www.instagram.com/reels/DgPh-ZvNLX9/")).toBe(clean);
    expect(reelUrlOf("https://www.instagram.com/p/DgPh-ZvNLX9/")).toBe("https://www.instagram.com/p/DgPh-ZvNLX9/");
  });

  it("refuse une story, un profil, un autre site et ce qui n'est pas une adresse", () => {
    expect(reelUrlOf("https://www.instagram.com/stories/dropzone.officiel/3812345678901234567/")).toBeNull();
    expect(reelUrlOf("https://www.instagram.com/dropzone.officiel/")).toBeNull();
    expect(reelUrlOf("https://www.youtube.com/reel/DgPh-ZvNLX9/")).toBeNull();
    expect(reelUrlOf("https://instagram.com.evil.example/reel/DgPh-ZvNLX9/")).toBeNull();
    expect(reelUrlOf("http://www.instagram.com/reel/DgPh-ZvNLX9/")).toBeNull();
    expect(reelUrlOf("javascript:alert(1)")).toBeNull();
    expect(reelUrlOf("pas un lien")).toBeNull();
    expect(reelUrlOf("")).toBeNull();
  });
});

describe("isReelUrl et posterOf", () => {
  it("un Reel n'a pas de vignette à nous : Instagram affiche la sienne", () => {
    expect(isReelUrl("https://www.instagram.com/reel/DgPh-ZvNLX9/")).toBe(true);
    expect(posterOf("https://www.instagram.com/reel/DgPh-ZvNLX9/")).toBeNull();
  });

  it("une ancienne vidéo Cloudinary garde sa vignette (l'extension remplacée par .jpg)", () => {
    expect(isReelUrl("https://res.cloudinary.com/x/video/upload/v1/dropzone/variants/a.mp4")).toBe(false);
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
