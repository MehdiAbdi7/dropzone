import { describe, expect, it } from "vitest";
import { ACCESS_RULES, ROLE_RANK, minRoleFor, roleCanCall, ruleAllows, ruleFor } from "../src/middlewares/access.js";

// Les droits du cahier §4.13, écrits en dur : toute modification de la table doit changer ce test aussi,
// donc passer par une décision. La matrice, elle, vérifie que le middleware applique la table.
const SELLER_ROUTES = [
  "GET /cash/today",
  "POST /cash/open",
  "POST /cash/close",
  "POST /sales",
  "POST /exchanges",
  // Une commande reçue par téléphone (19/11) : le vendeur la saisit, la page Commandes reste au responsable.
  "POST /orders",
  "GET /variants",
  "GET /invoice-settings",
  "PUT /invoice-settings",
  "PUT /store/hours",
  "POST /orders/:id/invoice",
  // Remplacer l'appareil d'une réparation sous garantie (atelier, étape 6) : le technicien n'y a pas droit.
  "POST /repairs/:id/replace",
];
const MANAGER_ROUTES = [
  "GET /orders",
  "GET /orders/:id",
  "PATCH /orders/:id/status",
  "POST /orders/:id/pickup",
  "POST /orders/:id/baridi-number",
  "POST /orders/:id/advance-received",
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

// L'exception au nettoyage des coûts (18/11) : le vendeur voit le prix d'achat dans la recherche de produit,
// pour savoir jusqu'où négocier, et nulle part ailleurs.
describe("showsCost", () => {
  it("n'est posé que sur la recherche de variantes", () => {
    expect(ACCESS_RULES.filter((rule) => rule.showsCost).map((rule) => `${rule.method} ${rule.path}`)).toEqual(["GET /variants"]);
    expect(ruleFor("GET", "/variants")?.showsCost).toBe(true);
    expect(ruleFor("GET", "/orders/5")?.showsCost).toBeUndefined();
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

// L'atelier (étape 5) : le technicien n'est PAS au-dessus du vendeur. Ses routes sont des règles à liste de rôles.
describe("le technicien et les règles à liste de rôles", () => {
  const rule = (roles: ("technician" | "seller" | "order_manager" | "admin")[]) => ({ method: "GET" as const, path: "/x", roles });

  it("le technicien est au rang 0 : aucune règle à rôle minimum ne le laisse passer", () => {
    expect(ROLE_RANK.technician).toBe(0);
    for (const rule of ACCESS_RULES.filter((candidate) => candidate.min)) {
      expect(ruleAllows(rule, "technician"), `${rule.method} ${rule.path}`).toBe(false);
    }
  });

  it("une règle à liste laisse passer les rôles listés et l'admin, et personne d'autre", () => {
    expect(ruleAllows(rule(["technician"]), "technician")).toBe(true);
    expect(ruleAllows(rule(["technician"]), "admin")).toBe(true);
    expect(ruleAllows(rule(["technician"]), "seller")).toBe(false);
    expect(ruleAllows(rule(["technician"]), "order_manager")).toBe(false);
    expect(ruleAllows(rule(["technician"]), "customer")).toBe(false);
  });

  it("une règle à rôle minimum garde l'escalier", () => {
    const seller = { method: "GET" as const, path: "/x", min: "seller" as const };
    expect(ruleAllows(seller, "seller")).toBe(true);
    expect(ruleAllows(seller, "order_manager")).toBe(true);
    expect(ruleAllows(seller, "technician")).toBe(false);
    expect(ruleAllows(seller, "customer")).toBe(false);
  });

  it("l'atelier : les pièces et les réparations en lecture sont ouvertes au technicien, au vendeur et au responsable", () => {
    for (const [method, path] of [["GET", "/repairs"], ["GET", "/repairs/3"], ["GET", "/parts"], ["POST", "/repairs/3/status"]] as const) {
      const found = ruleFor(method, path)!;
      expect(ruleAllows(found, "technician"), `${method} ${path} technicien`).toBe(true);
      expect(ruleAllows(found, "seller"), `${method} ${path} vendeur`).toBe(true);
    }
  });

  it("le stock d'une pièce est au technicien seul (hors admin) : le vendeur n'y touche pas", () => {
    for (const [method, path] of [["POST", "/parts"], ["POST", "/parts/3/arrivals"], ["GET", "/parts/3/movements"]] as const) {
      const found = ruleFor(method, path)!;
      expect(ruleAllows(found, "technician"), `${method} ${path}`).toBe(true);
      expect(ruleAllows(found, "seller"), `${method} ${path}`).toBe(false);
      expect(ruleAllows(found, "order_manager"), `${method} ${path}`).toBe(false);
    }
  });

  it("reste fermé par défaut : modifier une pièce, corriger un stock, supprimer une fiche sont pour l'admin", () => {
    expect(ruleFor("PATCH", "/parts/3")).toBeUndefined();
    expect(ruleFor("POST", "/parts/3/corrections")).toBeUndefined();
    expect(ruleFor("DELETE", "/repairs/3")).toBeUndefined();
  });

  it("le prix d'achat n'est ouvert qu'au technicien sur les routes des pièces et des réparations", () => {
    expect(ruleFor("GET", "/parts")?.costFor).toEqual(["technician"]);
    expect(ruleFor("GET", "/repairs/3")?.costFor).toEqual(["technician"]);
    expect(ruleFor("GET", "/orders")?.costFor).toBeUndefined();
  });
});

// Relecture finale (étape 5) : Express route sans tenir compte de la casse, la table aussi. Sinon « /repairs/WARRANTY »
// tombait sur la règle `/repairs/:id` (ouverte au technicien) alors qu'Express exécutait la recherche de garantie.
describe("la casse et les segments littéraux", () => {
  // Le technicien crée une fiche (décision de Mehdi, 19/11) : il cherche donc la garantie de l'appareil, comme la vente.
  it("la recherche de garantie est ouverte à la vente et au technicien, quelle que soit la casse ou la barre finale", () => {
    for (const path of ["/repairs/warranty", "/repairs/WARRANTY", "/repairs/Warranty/", "/repairs/warranty/"]) {
      expect(roleCanCall("technician", "GET", path), path).toBe(true);
      expect(roleCanCall("seller", "GET", path), path).toBe(true);
      expect(roleCanCall("customer", "GET", path), path).toBe(false);
    }
  });

  it("créer une fiche est ouvert au technicien, au vendeur et au responsable, pas à un client", () => {
    for (const role of ["technician", "seller", "order_manager", "admin"] as const) expect(roleCanCall(role, "POST", "/repairs"), role).toBe(true);
    expect(roleCanCall("customer", "POST", "/repairs")).toBe(false);
  });

  it(":id ne vaut qu'un numéro : un mot n'est pas une fiche", () => {
    expect(roleCanCall("technician", "GET", "/repairs/12")).toBe(true);
    expect(roleCanCall("technician", "GET", "/repairs/export")).toBe(false);
    expect(roleCanCall("technician", "GET", "/repairs/counts")).toBe(true);
    expect(roleCanCall("technician", "GET", "/REPAIRS/COUNTS")).toBe(true);
  });
});
