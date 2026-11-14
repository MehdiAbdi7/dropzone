import { describe, expect, it } from "vitest";
import { isSwitchWithinPath } from "./pageTransitionRules";

const url = (path: string) => new URL(path, "https://dropzone.test");

describe("isSwitchWithinPath : un changement d'adresse qui compte comme un changement de page", () => {
  it("les onglets de Commandes (Retraits, Magasin) s'animent comme deux pages", () => {
    expect(isSwitchWithinPath(url("/admin/commandes?type=pickup"), url("/admin/commandes?type=in_store"))).toBe(true);
    expect(isSwitchWithinPath(url("/admin/commandes?type=in_store"), url("/admin/commandes?type=pickup"))).toBe(true);
  });

  it("changer l'état dans un onglet de Commandes n'anime pas (c'est un filtre)", () => {
    expect(isSwitchWithinPath(url("/admin/commandes?type=pickup"), url("/admin/commandes?type=pickup&status=reserved"))).toBe(false);
    expect(isSwitchWithinPath(url("/admin/commandes?type=pickup&status=reserved"), url("/admin/commandes?type=pickup&status=expired"))).toBe(false);
  });

  it("la couleur d'une fiche produit s'anime toujours", () => {
    expect(isSwitchWithinPath(url("/produits/iphone?couleur=noir"), url("/produits/iphone?couleur=argent"))).toBe(true);
    expect(isSwitchWithinPath(url("/produits/iphone"), url("/produits/iphone?couleur=argent"))).toBe(true);
  });

  it("les filtres d'ailleurs n'animent pas", () => {
    expect(isSwitchWithinPath(url("/admin/livraisons?status=delivered"), url("/admin/livraisons?status=shipped"))).toBe(false);
    expect(isSwitchWithinPath(url("/admin/historique?type=delivery"), url("/admin/historique?type=pickup"))).toBe(false);
    expect(isSwitchWithinPath(url("/produits/iphone?couleur=noir"), url("/produits/iphone?couleur=noir"))).toBe(false);
  });

  it("un changement de chemin n'est pas de son ressort (il anime déjà)", () => {
    expect(isSwitchWithinPath(url("/admin/livraisons"), url("/admin/commandes?type=pickup"))).toBe(false);
  });
});
