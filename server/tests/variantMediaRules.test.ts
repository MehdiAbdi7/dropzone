import { describe, expect, it } from "vitest";
import {
  checkMediaRoom,
  checkUploadedVideo,
  MAX_PHOTOS,
  MAX_VIDEO_SECONDS,
  mediaKindOf,
  PHOTO_MAX_BYTES,
  posterOf,
  VIDEO_MAX_BYTES,
} from "../src/modules/products/variantMedia.rules.js";

// Ce que Cloudinary a vraiment reçu pour une vidéo envoyée directement du navigateur (26/11). La taille mesurée est celle du
// fichier stocké, APRÈS la compression à l'envoi : une vidéo 4K de 300 Mo passe sous 50 Mo une fois réduite. La durée et la
// présence d'une image sont donc les vraies limites.
describe("checkUploadedVideo", () => {
  const ok = { bytes: 8_000_000, duration: 15, width: 720 };

  it("accepte une courte vidéo dans les limites", () => {
    expect(checkUploadedVideo(ok)).toEqual({ ok: true });
    expect(checkUploadedVideo({ ...ok, duration: MAX_VIDEO_SECONDS, bytes: VIDEO_MAX_BYTES })).toEqual({ ok: true });
  });

  it("refuse une vidéo trop lourde (413)", () => {
    expect(checkUploadedVideo({ ...ok, bytes: VIDEO_MAX_BYTES + 1 })).toMatchObject({ ok: false, status: 413 });
  });

  it("refuse une vidéo trop longue (413), même légère", () => {
    expect(checkUploadedVideo({ ...ok, duration: MAX_VIDEO_SECONDS + 1 })).toMatchObject({ ok: false, status: 413 });
  });

  it("refuse un fichier sans image : Cloudinary range un son avec les vidéos (400)", () => {
    expect(checkUploadedVideo({ ...ok, width: 0 })).toMatchObject({ ok: false, status: 400 });
  });
});

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
