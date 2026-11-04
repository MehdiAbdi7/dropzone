import { describe, expect, it } from "vitest";
import { catalogRedirect, legacyCatalogRedirect } from "./legacyRedirect";

const from = (query: string) => legacyCatalogRedirect(new URLSearchParams(query));
const page = (query: string) => catalogRedirect(new URLSearchParams(query));

// Depuis le 04/11, la page de tous les produits n'existe plus : /produits ne montre une
// liste que pour les affaires, la recherche et les accessoires d'un modèle (décision de Mehdi).
describe("catalogRedirect", () => {
  it("garde la liste des affaires, de la recherche et des accessoires d'un modèle", () => {
    expect(page("condition=affaire")).toBeNull();
    expect(page("condition=affaire&category=smartphones&page=2")).toBeNull();
    expect(page("q=iphone")).toBeNull();
    expect(page("q=iphone&condition=neuf")).toBeNull();
    expect(page("model=apple-iphone-15-pro-max")).toBeNull();
  });

  it("renvoie la page de tous les produits vers la Boutique", () => {
    expect(page("")).toBe("/boutique");
    expect(page("condition=neuf")).toBe("/boutique");
    expect(page("q=")).toBe("/boutique");
    expect(page("sort=prix-croissant&page=3")).toBe("/boutique");
  });

  it("renvoie une catégorie, et sa marque, vers leur page de la Boutique", () => {
    expect(page("category=tablettes")).toBe("/boutique/tablettes");
    expect(page("category=smartphones&brand=iphone")).toBe("/boutique/smartphones/iphone");
  });

  it("passe d'abord par les anciennes adresses des affaires", () => {
    expect(page("condition=reconditionne")).toBe("/produits?condition=affaire");
  });
});

describe("legacyCatalogRedirect", () => {
  it("renvoie l'ancien filtre des reconditionnés vers les affaires", () => {
    expect(from("condition=reconditionne")).toBe("/produits?condition=affaire");
  });

  it("renvoie l'ancienne page Affaires vers les affaires, en gardant les autres filtres", () => {
    expect(from("category=smartphones&offre=affaire")).toBe("/produits?category=smartphones&condition=affaire");
  });

  it("ne touche pas une adresse déjà à jour", () => {
    expect(from("condition=neuf")).toBeNull();
    expect(from("condition=affaire&page=2")).toBeNull();
    expect(from("")).toBeNull();
  });
});
