import { describe, expect, it } from "vitest";
import type { Variant } from "@/types/api";
import { mediaSummary, shownMedia } from "./variantMediaRules";

// Ce que le client lit sur la fiche d'un appareil d'occasion : combien de photos et s'il y a une vidéo, avant d'ouvrir.
describe("mediaSummary", () => {
  const photo = { kind: "photo" as const, url: "p", posterUrl: null };
  const video = { kind: "video" as const, url: "v", posterUrl: "v.jpg" };

  it("compte les photos et signale la vidéo", () => {
    expect(mediaSummary([photo, photo, video])).toBe("2 photos et la vidéo");
    expect(mediaSummary([photo, video])).toBe("1 photo et la vidéo");
  });

  it("une photo, plusieurs photos, ou la vidéo seule", () => {
    expect(mediaSummary([photo])).toBe("1 photo");
    expect(mediaSummary([photo, photo, photo])).toBe("3 photos");
    expect(mediaSummary([video])).toBe("la vidéo");
  });

  it("rien à dire sans média, ou sans le champ (réponse d'une API plus ancienne)", () => {
    expect(mediaSummary([])).toBeNull();
    expect(mediaSummary(undefined)).toBeNull();
  });
});

// Les photos et la vidéo montrées sous le téléphone (26/11) : celles de la variante choisie, jamais celles de la couleur.
const video = { kind: "video" as const, url: "https://x/v.mp4", posterUrl: "https://x/v.jpg" };
const photo = { kind: "photo" as const, url: "https://x/p.webp", posterUrl: null };

const variants = [
  { sku: "A", media: [photo, video] },
  { sku: "B", media: [] },
  { sku: "C" },
] as unknown as Variant[];

describe("shownMedia", () => {
  it("rend les médias de la variante choisie, dans l'ordre", () => {
    expect(shownMedia(variants, "A")).toEqual([photo, video]);
  });

  it("rend rien tant qu'aucune variante n'est choisie", () => {
    expect(shownMedia(variants, null)).toEqual([]);
  });

  it("rend rien pour un SKU inconnu, une variante sans média ou une réponse sans le champ", () => {
    expect(shownMedia(variants, "Z")).toEqual([]);
    expect(shownMedia(variants, "B")).toEqual([]);
    expect(shownMedia(variants, "C")).toEqual([]);
  });
});
