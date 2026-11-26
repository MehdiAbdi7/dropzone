import { describe, expect, it } from "vitest";
import type { Variant } from "@/types/api";
import { pinFirst, shownMedia } from "./variantMediaRules";

// L'appareil visé par un lien de story passe en tête de la liste d'occasions (26/11) : sur téléphone, la liste est sous le
// téléphone et ses miniatures, il doit être visible sans défiler (défiler vers lui sortait les miniatures de l'écran).
describe("pinFirst", () => {
  const list = [{ sku: "A" }, { sku: "B" }, { sku: "C" }];

  it("met l'appareil visé en tête et garde l'ordre des autres", () => {
    expect(pinFirst(list, "C").map((item) => item.sku)).toEqual(["C", "A", "B"]);
  });

  it("ne change rien sans SKU ou avec un SKU absent de la liste", () => {
    expect(pinFirst(list, null)).toEqual(list);
    expect(pinFirst(list, "Z")).toEqual(list);
  });

  it("ne modifie pas la liste d'origine", () => {
    pinFirst(list, "C");
    expect(list.map((item) => item.sku)).toEqual(["A", "B", "C"]);
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
