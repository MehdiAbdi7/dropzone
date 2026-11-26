import { describe, expect, it } from "vitest";
import {
  checkMediaRoom,
  MAX_PHOTOS,
  mediaKindOf,
  PHOTO_MAX_BYTES,
  posterOf,
  VIDEO_MAX_BYTES,
} from "../src/modules/products/variantMedia.rules.js";

const room = { stock: 1, kind: "photo" as const, photos: 0, videos: 0, size: 1000 };

describe("mediaKindOf", () => {
  it("reconnaît les photos, les vidéos et refuse le reste", () => {
    expect(mediaKindOf("image/webp")).toBe("photo");
    expect(mediaKindOf("image/jpeg")).toBe("photo");
    expect(mediaKindOf("video/mp4")).toBe("video");
    expect(mediaKindOf("video/quicktime")).toBe("video");
    expect(mediaKindOf("application/pdf")).toBeNull();
  });
});

describe("posterOf", () => {
  it("remplace l'extension de la vidéo par .jpg (la couverture fournie par Cloudinary)", () => {
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

  it("refuse une photo ou une vidéo au-dessus de sa taille maximale", () => {
    expect(checkMediaRoom({ ...room, size: PHOTO_MAX_BYTES + 1 })).toMatchObject({ ok: false, status: 413 });
    expect(checkMediaRoom({ ...room, kind: "video", size: VIDEO_MAX_BYTES + 1 })).toMatchObject({ ok: false, status: 413 });
    expect(checkMediaRoom({ ...room, kind: "video", size: VIDEO_MAX_BYTES })).toEqual({ ok: true });
  });
});
