import { describe, expect, it } from "vitest";
import { accessoryRedirect, catalogRedirect, legacyCatalogRedirect, retiredProductRedirect } from "./legacyRedirect";

const from = (query: string) => legacyCatalogRedirect(new URLSearchParams(query));
const page = (query: string) => catalogRedirect(new URLSearchParams(query));

// Depuis le 04/11, la page de tous les produits n'existe plus : /produits ne montre une
// liste que pour les affaires, la recherche et les accessoires d'un modèle (décision de Mehdi).
describe("catalogRedirect", () => {
  it("renvoie les affaires vers le choix des catégories, mais garde recherche et accessoires", () => {
    expect(page("condition=affaire")).toBe("/boutique");
    expect(page("condition=affaire&category=smartphones&page=2")).toBe("/boutique");
    expect(page("q=iphone")).toBeNull();
    expect(page("q=")).toBeNull();
    expect(page("q=iphone&condition=neuf")).toBeNull();
    expect(page("model=apple-iphone-15-pro-max")).toBeNull();
  });

  it("renvoie la page de tous les produits vers la Boutique", () => {
    expect(page("")).toBe("/boutique");
    expect(page("condition=neuf")).toBe("/boutique");
    expect(page("sort=prix-croissant&page=3")).toBe("/boutique");
  });

  it("renvoie une catégorie, et sa marque, vers leur page de la Boutique", () => {
    expect(page("category=tablettes")).toBe("/boutique/tablettes");
    expect(page("category=smartphones&brand=iphone")).toBe("/boutique/smartphones/iphone");
  });

  it("passe d'abord par les anciennes adresses des affaires", () => {
    expect(page("condition=reconditionne")).toBe("/boutique");
  });
});

describe("legacyCatalogRedirect", () => {
  it("renvoie l'ancien filtre des reconditionnés vers le choix des catégories", () => {
    expect(from("condition=reconditionne")).toBe("/boutique");
  });

  it("renvoie l'ancienne page Affaires vers le choix des catégories", () => {
    expect(from("category=smartphones&offre=affaire")).toBe("/boutique");
  });

  it("ne touche pas une adresse déjà à jour", () => {
    expect(from("condition=neuf")).toBeNull();
    expect(from("condition=affaire&page=2")).toBeNull();
    expect(from("")).toBeNull();
  });
});

// Refonte du 12/11 : plus d'étape marque ni d'affiches pour les accessoires, une page à filtres.
describe("accessoryRedirect", () => {
  it("envoie un ancien type vers la page des accessoires filtrée", () => {
    expect(accessoryRedirect("accessoires", "chargeurs")).toBe("/boutique/accessoires?type=chargeurs");
  });

  it("garde la marque d'une ancienne page d'affiches", () => {
    expect(accessoryRedirect("accessoires", "coques", "iphone")).toBe("/boutique/accessoires?type=coques&marque=iphone");
  });
});

describe("retiredProductRedirect", () => {
  it("envoie un ancien verre vers les verres incassables", () => {
    expect(retiredProductRedirect("verre-trempe-incassable-iphone-15", true)).toBe("/boutique/accessoires?type=incassable-ecran");
  });

  it("envoie une ancienne coque vers les coques", () => {
    expect(retiredProductRedirect("coque-antichoc-transparente-iphone-15", true)).toBe("/boutique/accessoires?type=coques");
  });

  it("ne dit rien quand l'API ne répond pas : la fiche existe peut-être encore", () => {
    expect(retiredProductRedirect("coque-antichoc-transparente-iphone", false)).toBeNull();
  });

  it("ne dit rien d'un autre produit", () => {
    expect(retiredProductRedirect("iphone-17-pro-max", true)).toBeNull();
  });
});
