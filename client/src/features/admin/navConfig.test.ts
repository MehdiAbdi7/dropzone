import { describe, expect, it } from "vitest";
import { SECTIONS, activeTab, ordersHref, ordersListHref, sectionFor } from "./navConfig";

const params = (query = "") => new URLSearchParams(query);

describe("les sections du back-office", () => {
  it("sept sections, sans doublon d'adresse", () => {
    expect(SECTIONS.map((section) => section.key)).toEqual([
      "accueil",
      "ventes",
      "commandes",
      "catalogue",
      "historique",
      "clients",
      "personnalisation",
    ]);
    // Une section s'ouvre sur son premier onglet ; aucune adresse n'apparaît deux fois ailleurs.
    for (const section of SECTIONS) {
      if (section.tabs) expect(section.href, section.key).toBe(section.tabs[0]!.href);
    }
    const tabHrefs = SECTIONS.flatMap((section) => (section.tabs ?? []).map((tab) => tab.href));
    const sectionHrefs = SECTIONS.filter((section) => !section.tabs).map((section) => section.href);
    const all = [...tabHrefs, ...sectionHrefs];
    expect(new Set(all).size).toBe(all.length);
  });

  it("chaque page appartient à une section", () => {
    const cases: [string, string][] = [
      ["/admin", "accueil"],
      ["/admin/caisse", "ventes"],
      ["/admin/vente", "ventes"],
      ["/admin/livraisons", "commandes"],
      ["/admin/commandes", "commandes"],
      ["/admin/commandes/12", "commandes"],
      ["/admin/catalogue", "catalogue"],
      ["/admin/catalogue/modeles/3/couleurs/noir", "catalogue"],
      ["/admin/produits", "catalogue"],
      ["/admin/produits/nouveau", "catalogue"],
      ["/admin/produits/7", "catalogue"],
      ["/admin/historique", "historique"],
      ["/admin/clients", "clients"],
      ["/admin/accueil", "personnalisation"],
      ["/admin/listes", "personnalisation"],
    ];
    for (const [path, key] of cases) expect(sectionFor(path)?.key, path).toBe(key);
  });

  it("Réglages n'est pas une section : il vit dans le menu du haut", () => {
    expect(sectionFor("/admin/reglages")).toBeUndefined();
  });

  it("« /admin » seul ne tire pas toutes les pages vers l'accueil", () => {
    expect(sectionFor("/admin/inconnue")).toBeUndefined();
  });
});

describe("l'onglet actif d'une section", () => {
  const tabHref = (path: string, query = "") => {
    const section = sectionFor(path)!;
    return activeTab(section, path, params(query))?.href;
  };

  it("Commandes : Livraisons, Retraits et Magasin", () => {
    expect(tabHref("/admin/livraisons")).toBe("/admin/livraisons");
    expect(tabHref("/admin/commandes", "type=pickup")).toBe("/admin/commandes?type=pickup");
    expect(tabHref("/admin/commandes", "type=in_store&status=picked_up")).toBe("/admin/commandes?type=in_store");
  });

  it("Catalogue : par catégorie, ou tous les produits", () => {
    expect(tabHref("/admin/catalogue/modeles/3")).toBe("/admin/catalogue");
    expect(tabHref("/admin/produits/12")).toBe("/admin/produits");
  });

  it("Ventes et Personnalisation", () => {
    expect(tabHref("/admin/vente")).toBe("/admin/vente");
    expect(tabHref("/admin/caisse")).toBe("/admin/caisse");
    expect(tabHref("/admin/listes")).toBe("/admin/listes");
    expect(tabHref("/admin/accueil")).toBe("/admin/accueil");
  });

  it("le détail d'une commande n'allume aucun onglet", () => {
    expect(tabHref("/admin/commandes/12")).toBeUndefined();
  });
});

describe("ordersListHref : le retour du détail d'une commande", () => {
  it("chaque type revient à sa liste", () => {
    expect(ordersListHref("delivery")).toBe("/admin/livraisons");
    expect(ordersListHref("pickup")).toBe("/admin/commandes?type=pickup");
    expect(ordersListHref("in_store")).toBe("/admin/commandes?type=in_store");
  });
});

describe("ordersHref : un état de commande mène au bon onglet", () => {
  it("les états d'une livraison vont sur la page Livraisons", () => {
    for (const status of ["pending", "confirmed", "shipped", "delivered", "collected", "returned", "cancelled"]) {
      expect(ordersHref(status), status).toBe(`/admin/livraisons?status=${status}`);
    }
  });

  it("les états d'un retrait vont sur l'onglet Retraits", () => {
    for (const status of ["reserved", "picked_up", "expired"]) {
      expect(ordersHref(status), status).toBe(`/admin/commandes?type=pickup&status=${status}`);
    }
  });

  it("sans état : la page Livraisons", () => {
    expect(ordersHref()).toBe("/admin/livraisons");
  });
});
