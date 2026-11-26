import { describe, expect, it } from "vitest";
import { fileProblem, mediaPanelState, storyLink } from "./variantMedia";

// Ce qu'on vérifie sur le fichier choisi, avant tout envoi (26/11) : un refus clair tout de suite vaut mieux qu'une minute
// d'envoi pour apprendre que 60 Mo c'est trop. Mêmes plafonds que l'API : photo 4 Mo, vidéo 50 Mo.
describe("fileProblem", () => {
  const mo = 1024 * 1024;

  it("accepte une photo, une vidéo dans les limites", () => {
    expect(fileProblem({ type: "image/jpeg", size: 3 * mo })).toBeNull();
    expect(fileProblem({ type: "video/mp4", size: 49 * mo })).toBeNull();
    expect(fileProblem({ type: "video/quicktime", size: 50 * mo })).toBeNull();
  });

  it("refuse une photo de plus de 4 Mo, avec son plafond dans le message", () => {
    expect(fileProblem({ type: "image/png", size: 4 * mo + 1 })).toContain("4 Mo");
  });

  it("refuse une vidéo de plus de 50 Mo, avec son plafond dans le message", () => {
    expect(fileProblem({ type: "video/mp4", size: 50 * mo + 1 })).toContain("50 Mo");
  });

  it("refuse un autre type de fichier", () => {
    expect(fileProblem({ type: "application/pdf", size: 1000 })).toContain("JPEG");
    expect(fileProblem({ type: "image/gif", size: 1000 })).toContain("JPEG");
  });
});

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
