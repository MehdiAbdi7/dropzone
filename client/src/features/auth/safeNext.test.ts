import { describe, expect, it } from "vitest";
import { safeNext } from "./safeNext";

const ORIGIN = "https://dropzone-eight.vercel.app";

describe("safeNext", () => {
  it("garde une page de la boutique", () => {
    expect(safeNext("/compte/commandes", false, ORIGIN)).toBe("/compte/commandes");
  });

  it("garde les paramètres et l'ancre", () => {
    expect(safeNext("/admin/produits?statut=brouillon#liste", true, ORIGIN)).toBe(
      "/admin/produits?statut=brouillon#liste",
    );
  });

  it("sans page demandée, envoie le client sur /compte et l'admin sur /admin", () => {
    expect(safeNext(undefined, false, ORIGIN)).toBe("/compte");
    expect(safeNext(undefined, true, ORIGIN)).toBe("/admin");
  });

  // Une « redirection ouverte » : un lien de connexion piégé qui, une fois connecté,
  // emmène sur un autre site. Chaque adresse ci-dessous mène hors de la boutique.
  it.each([
    ["une adresse complète", "https://pirate.example"],
    ["une adresse sans protocole", "//pirate.example"],
    ["une barre oblique inverse, lue comme / par le navigateur", "/\\pirate.example"],
    ["une tabulation, retirée par le navigateur", "/\t/pirate.example"],
    ["un script", "javascript:alert(1)"],
    // new URL nettoie le chemin : ces trois-là deviennent « //pirate.example ».
    ["un point qui disparaît au nettoyage", "/.//pirate.example"],
    ["un dossier parent qui disparaît au nettoyage", "/a/..//pirate.example"],
    ["un point encodé (%2e)", "/%2e//pirate.example"],
  ])("refuse %s", (_case, suite) => {
    expect(safeNext(suite, false, ORIGIN)).toBe("/compte");
  });
});
