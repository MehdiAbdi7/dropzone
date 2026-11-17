import { describe, expect, it } from "vitest";
import { ACCESS_RULES, ROLE_RANK, minRoleFor } from "../src/middlewares/access.js";

// Les droits du cahier §4.13, écrits en dur : toute modification de la table doit changer ce test aussi,
// donc passer par une décision. La matrice, elle, vérifie que le middleware applique la table.
const SELLER_ROUTES = [
  "GET /cash/today",
  "POST /cash/open",
  "POST /cash/close",
  "POST /sales",
  "POST /exchanges",
  "GET /variants",
  "GET /invoice-settings",
  "PUT /invoice-settings",
  "PUT /store/hours",
  "POST /orders/:id/invoice",
];
const MANAGER_ROUTES = [
  "GET /orders",
  "GET /orders/:id",
  "PATCH /orders/:id/status",
  "POST /orders/:id/pickup",
  "POST /orders/:id/collect",
  "POST /orders/:id/return",
  "GET /deliveries/summary",
];
const routesFor = (min: string) => ACCESS_RULES.filter((rule) => rule.min === min).map((rule) => `${rule.method} ${rule.path}`);

describe("le contenu de la table", () => {
  it("donne au vendeur exactement les routes du comptoir", () => {
    expect(routesFor("seller")).toEqual(SELLER_ROUTES);
  });

  it("donne au responsable commande exactement la page Commandes en plus", () => {
    expect(routesFor("order_manager")).toEqual(MANAGER_ROUTES);
  });

  it("ne donne jamais une route à l'admin dans la table : c'est le défaut", () => {
    expect(routesFor("admin")).toEqual([]);
  });
});

// La table des droits du back-office (lot 7) : quel rôle minimum pour chaque route, fermée par défaut.
describe("ROLE_RANK", () => {
  it("range les rôles en escalier : client < vendeur < responsable commande < admin", () => {
    expect(ROLE_RANK.customer).toBeLessThan(ROLE_RANK.seller);
    expect(ROLE_RANK.seller).toBeLessThan(ROLE_RANK.order_manager);
    expect(ROLE_RANK.order_manager).toBeLessThan(ROLE_RANK.admin);
  });
});

describe("minRoleFor", () => {
  it("donne le rôle minimum d'une route de la table, :id valant n'importe quel numéro", () => {
    expect(minRoleFor("PATCH", "/orders/12/status")).toBe("order_manager");
    expect(minRoleFor("POST", "/sales")).toBe("seller");
    expect(minRoleFor("PUT", "/store/hours")).toBe("seller");
    expect(minRoleFor("GET", "/orders")).toBe("order_manager");
  });

  it("distingue deux routes de même adresse selon la méthode", () => {
    expect(minRoleFor("GET", "/orders/12")).toBe("order_manager");
    expect(minRoleFor("PATCH", "/orders/12")).toBe("admin");
    expect(minRoleFor("DELETE", "/orders/12")).toBe("admin");
  });

  it("tolère une barre finale", () => {
    expect(minRoleFor("POST", "/orders/12/invoice/")).toBe("seller");
  });

  it("reste fermée par défaut : une route absente de la table est pour l'admin", () => {
    expect(minRoleFor("GET", "/inconnue")).toBe("admin");
    expect(minRoleFor("GET", "/history")).toBe("admin");
    expect(minRoleFor("POST", "/cash/reopen")).toBe("admin");
  });

  it("ne confond pas une adresse plus longue avec une adresse de la table", () => {
    expect(minRoleFor("GET", "/orders/12/status")).toBe("admin");
    expect(minRoleFor("POST", "/sales/extra")).toBe("admin");
  });
});
