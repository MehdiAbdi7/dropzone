import { describe, expect, it } from "vitest";
import { BOTTOM_MORE, BOTTOM_PRIMARY, MENU_SECTIONS, NAV_SECTIONS, SECTIONS, activeTab, ordersHref, ordersListHref, sectionFor, visibleSections } from "./navConfig";

const params = (query = "") => new URLSearchParams(query);

// Lot 7 : chaque rôle ne voit que les sections qu'il peut ouvrir (la règle vient de access.ts).
describe("visibleSections", () => {
  const keys = (role: Parameters<typeof visibleSections>[0]) => visibleSections(role).map((section) => section.key);

  it("le vendeur : la vente (avec l'échange) et la caisse", () => {
    expect(keys("seller")).toEqual(["vente", "caisse"]);
  });

  it("le responsable commande : le vendeur, plus les commandes", () => {
    expect(keys("order_manager")).toEqual(["vente", "caisse", "commandes"]);
  });

  it("l'admin : toutes les sections", () => {
    expect(keys("admin")).toEqual(SECTIONS.map((section) => section.key));
  });

  it("un client : aucune", () => {
    expect(keys("customer")).toEqual([]);
  });
});

describe("les sections du back-office", () => {
  it("huit sections : la vente au magasin et la caisse sont des pages à part", () => {
    expect(SECTIONS.map((section) => section.key)).toEqual([
      "accueil",
      "vente",
      "caisse",
      "commandes",
      "catalogue",
      "historique",
      "clients",
      "personnalisation",
    ]);
  });

  it("une section à onglets s'ouvre sur son premier onglet, et aucune adresse n'apparaît deux fois ailleurs", () => {
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
      ["/admin/vente", "vente"],
      ["/admin/caisse", "caisse"],
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

  it("la caisse n'a pas de sous-onglets", () => {
    expect(sectionFor("/admin/caisse")?.tabs).toBeUndefined();
  });

  // Lot 5 : la vente et l'échange sont les deux gestes du comptoir, dans la même section.
  it("la vente et l'échange partagent la section Ventes, avec un onglet chacun", () => {
    expect(sectionFor("/admin/echange")?.key).toBe("vente");
    const section = sectionFor("/admin/vente")!;
    expect(section.tabs?.map((tab) => tab.label)).toEqual(["Vente", "Échange"]);
    expect(activeTab(section, "/admin/vente", new URLSearchParams())?.label).toBe("Vente");
    expect(activeTab(section, "/admin/echange", new URLSearchParams())?.label).toBe("Échange");
  });

  it("les reprises à mettre en vente sont un onglet du Catalogue", () => {
    expect(sectionFor("/admin/reprises")?.key).toBe("catalogue");
    expect(sectionFor("/admin/reprises")?.tabs?.map((tab) => tab.label)).toContain("Reprises");
  });
});

// Où chaque section s'affiche (demande de Mehdi du 14/11) : la Caisse et la Personnalisation sont dans le
// menu ☰ de la barre du haut (ordinateur comme téléphone), pas dans la barre latérale ni la barre du bas.
describe("où s'affiche chaque section", () => {
  const keys = (sections: { key: string }[]) => sections.map((section) => section.key);

  it("le menu ☰ prend la Caisse et la Personnalisation", () => {
    expect(keys(MENU_SECTIONS)).toEqual(["caisse", "personnalisation"]);
  });

  it("la barre latérale garde les six autres, dans l'ordre de travail", () => {
    expect(keys(NAV_SECTIONS)).toEqual(["accueil", "vente", "commandes", "catalogue", "historique", "clients"]);
  });

  it("sur téléphone : Accueil, Ventes, Commandes au milieu, Catalogue, puis Plus avec le reste", () => {
    expect(keys(BOTTOM_PRIMARY)).toEqual(["accueil", "vente", "commandes", "catalogue"]);
    expect(keys(BOTTOM_MORE)).toEqual(["historique", "clients"]);
  });

  it("aucune section n'apparaît à deux endroits", () => {
    const all = [...keys(MENU_SECTIONS), ...keys(BOTTOM_PRIMARY), ...keys(BOTTOM_MORE)];
    expect(new Set(all).size).toBe(all.length);
    expect(all.sort()).toEqual(keys(SECTIONS).sort());
  });
});

describe("l'onglet actif d'une section", () => {
  const tabHref = (path: string, query = "") => {
    const section = sectionFor(path)!;
    return activeTab(section, path, params(query))?.href;
  };

  it("Commandes : seulement Livraisons et Retraits (une vente au magasin n'a pas d'étapes)", () => {
    expect(sectionFor("/admin/livraisons")?.tabs?.map((tab) => tab.label)).toEqual(["Livraisons", "Retraits"]);
    expect(tabHref("/admin/livraisons")).toBe("/admin/livraisons");
    expect(tabHref("/admin/commandes", "type=pickup")).toBe("/admin/commandes?type=pickup");
    expect(tabHref("/admin/commandes", "type=pickup&status=reserved")).toBe("/admin/commandes?type=pickup");
  });

  it("Catalogue : par catégorie, ou tous les produits", () => {
    expect(tabHref("/admin/catalogue/modeles/3")).toBe("/admin/catalogue");
    expect(tabHref("/admin/produits/12")).toBe("/admin/produits");
  });

  it("Personnalisation : Boutique et Listes", () => {
    expect(tabHref("/admin/listes")).toBe("/admin/listes");
    expect(tabHref("/admin/accueil")).toBe("/admin/accueil");
  });

  it("le détail d'une commande n'allume aucun onglet", () => {
    expect(tabHref("/admin/commandes/12")).toBeUndefined();
  });
});

describe("ordersListHref : le retour du détail d'une commande", () => {
  it("une livraison et un retrait reviennent à leur liste, une vente au magasin à l'historique", () => {
    expect(ordersListHref("delivery")).toBe("/admin/livraisons");
    expect(ordersListHref("pickup")).toBe("/admin/commandes?type=pickup");
    expect(ordersListHref("in_store")).toBe("/admin/historique?type=in_store");
    expect(ordersListHref("exchange")).toBe("/admin/historique?type=exchange");
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
