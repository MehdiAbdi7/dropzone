import { describe, expect, it } from "vitest";
import { mediaPanelState, storyLink } from "./variantMedia";

// L'onglet « Photos et vidéo » d'une variante (26/11) : ce qu'il propose selon l'état de la variante, et le lien de la
// story Instagram (le bouton « Acheter » mène à cette variante précise).
const photos = (count: number) => Array.from({ length: count }, () => ({ kind: "photo" as const }));

describe("mediaPanelState", () => {
  it("une variante pas encore enregistrée demande d'enregistrer d'abord", () => {
    expect(mediaPanelState({ stock: "1" }, [])).toMatchObject({ canAdd: false, reason: "Enregistre d'abord la fiche" });
  });

  it("une variante épuisée (stock 0, « 0 » ou vide) n'accepte pas de médias", () => {
    for (const stock of [0, "0", ""]) {
      expect(mediaPanelState({ id: 4, stock }, [])).toMatchObject({
        canAdd: false,
        reason: "Pas de médias sur une variante épuisée",
      });
    }
  });

  it("compte les photos et les vidéos", () => {
    expect(mediaPanelState({ id: 4, stock: 1 }, [...photos(2), { kind: "video" }])).toMatchObject({ photos: 2, videos: 1, canAdd: true });
  });

  it("n'accepte plus rien quand 8 photos et la vidéo sont là", () => {
    expect(mediaPanelState({ id: 4, stock: 1 }, [...photos(8), { kind: "video" }])).toMatchObject({
      canAdd: false,
      reason: "8 photos et la vidéo sont déjà là : retire-en une pour en ajouter",
    });
  });

  it("accepte encore une vidéo quand il y a 8 photos", () => {
    expect(mediaPanelState({ id: 4, stock: 1 }, photos(8))).toMatchObject({ canAdd: true, reason: null });
  });

  it("variante libre : on peut ajouter, sans raison de refus", () => {
    expect(mediaPanelState({ id: 4, stock: 2 }, [])).toEqual({ canAdd: true, reason: null, photos: 0, videos: 0 });
  });
});

describe("storyLink", () => {
  it("construit le lien d'une occasion vers sa couleur, son état et sa variante", () => {
    expect(storyLink({ slug: "iphone-15-pro-max", color: "Titane noir", condition: "refurbished", sku: "IP-R-DEAL" })).toBe(
      "/produits/iphone-15-pro-max/couleurs?couleur=Titane%20noir&etat=occasion&variante=IP-R-DEAL",
    );
  });

  it("choisit « neuf » pour un neuf et encode le SKU", () => {
    expect(storyLink({ slug: "galaxy-s24", color: "Noir", condition: "new", sku: "S24 U/1" })).toBe(
      "/produits/galaxy-s24/couleurs?couleur=Noir&etat=neuf&variante=S24%20U%2F1",
    );
  });
});
