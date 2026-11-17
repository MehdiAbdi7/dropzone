import { describe, expect, it } from "vitest";
import { canAccess, homeFor, isBackOffice } from "./access";

// Ce que chaque rôle peut ouvrir dans le back-office (lot 7). Reflet de la table de l'API : ici on ne fait
// que choisir quoi afficher, c'est l'API qui protège vraiment.
const SELLER_PAGES = ["/admin/vente", "/admin/echange", "/admin/caisse", "/admin/reglages", "/admin/facture/12", "/admin/compte"];
const MANAGER_ONLY_PAGES = ["/admin/livraisons", "/admin/commandes", "/admin/commandes/12"];
const ADMIN_ONLY_PAGES = [
  "/admin",
  "/admin/historique",
  "/admin/clients",
  "/admin/comptes",
  "/admin/reprises",
  "/admin/catalogue",
  "/admin/catalogue/modeles/3",
  "/admin/produits/nouveau",
  "/admin/accueil",
  "/admin/listes",
  "/admin/categories",
  "/admin/modeles",
];

describe("canAccess", () => {
  it.each(SELLER_PAGES)("le vendeur ouvre %s", (path) => {
    expect(canAccess("seller", path)).toBe(true);
  });

  it.each([...MANAGER_ONLY_PAGES, ...ADMIN_ONLY_PAGES])("le vendeur n'ouvre pas %s", (path) => {
    expect(canAccess("seller", path)).toBe(false);
  });

  it.each([...SELLER_PAGES, ...MANAGER_ONLY_PAGES])("le responsable commande ouvre %s", (path) => {
    expect(canAccess("order_manager", path)).toBe(true);
  });

  it.each(ADMIN_ONLY_PAGES)("le responsable commande n'ouvre pas %s", (path) => {
    expect(canAccess("order_manager", path)).toBe(false);
  });

  it.each([...SELLER_PAGES, ...MANAGER_ONLY_PAGES, ...ADMIN_ONLY_PAGES])("l'admin ouvre %s", (path) => {
    expect(canAccess("admin", path)).toBe(true);
  });

  it("un client n'ouvre rien du back-office", () => {
    for (const path of [...SELLER_PAGES, ...ADMIN_ONLY_PAGES]) expect(canAccess("customer", path), path).toBe(false);
  });

  it("compare des segments entiers : /admin/vente-x n'est pas /admin/vente", () => {
    expect(canAccess("seller", "/admin/vente-x")).toBe(false);
    expect(canAccess("seller", "/admin/caisses")).toBe(false);
    expect(canAccess("seller", "/admin/vente/")).toBe(true);
  });
});

describe("homeFor", () => {
  it("envoie chaque rôle sur sa première page", () => {
    expect(homeFor("seller")).toBe("/admin/vente");
    expect(homeFor("order_manager")).toBe("/admin/livraisons");
    expect(homeFor("admin")).toBe("/admin");
    expect(homeFor("customer")).toBe("/compte");
  });

  it("la première page de chaque rôle lui est ouverte", () => {
    for (const role of ["seller", "order_manager", "admin"] as const) expect(canAccess(role, homeFor(role)), role).toBe(true);
  });
});

describe("isBackOffice", () => {
  it("vrai pour le personnel, faux pour un client", () => {
    expect(isBackOffice("seller")).toBe(true);
    expect(isBackOffice("order_manager")).toBe(true);
    expect(isBackOffice("admin")).toBe(true);
    expect(isBackOffice("customer")).toBe(false);
  });
});
