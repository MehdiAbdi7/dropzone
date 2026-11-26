import { describe, expect, it } from "vitest";
import type { Variant } from "@/types/api";
import { shownMedia } from "./variantMediaRules";

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
