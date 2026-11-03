import { describe, expect, it } from "vitest";
import { legacyCatalogRedirect } from "./legacyRedirect";

const from = (query: string) => legacyCatalogRedirect(new URLSearchParams(query));

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
