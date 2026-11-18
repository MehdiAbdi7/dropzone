import { beforeEach, describe, expect, it } from "vitest";
import { loginAs, resetDb } from "./helpers.js";

// Le technicien (atelier, étape 5) n'a AUCUNE route de l'escalier : ni la vente, ni la caisse, ni les commandes,
// ni l'historique, ni les comptes, ni les reprises. Fermé par défaut, essayé sur l'application réelle.
beforeEach(resetDb);

const FORBIDDEN: [string, string][] = [
  ["GET", "/cash/today"],
  ["POST", "/cash/open"],
  ["POST", "/sales"],
  ["POST", "/exchanges"],
  ["GET", "/variants"],
  ["GET", "/invoice-settings"],
  ["PUT", "/store/hours"],
  ["GET", "/orders"],
  ["GET", "/orders/1"],
  ["PATCH", "/orders/1/status"],
  ["GET", "/deliveries/summary"],
  ["GET", "/history"],
  ["GET", "/stats"],
  ["GET", "/customers"],
  ["GET", "/accounts"],
  ["GET", "/trade-ins"],
  ["GET", "/products"],
  ["GET", "/brands/1"],
];

describe("le technicien", () => {
  it.each(FORBIDDEN)("%s %s : 403", async (method, path) => {
    const { agent } = await loginAs("technician", "tech@test.dz");
    const verb = method.toLowerCase() as "get" | "post" | "put" | "patch";
    expect((await agent[verb](`/admin${path}`).send({})).status).toBe(403);
  });

  it("peut se connecter au back-office et lire son compte", async () => {
    const { agent } = await loginAs("technician", "tech2@test.dz");
    const me = await agent.get("/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.data.role).toBe("technician");
  });
});

// Relecture finale : « /repairs/WARRANTY » (majuscules) tombait sur la règle `/repairs/:id` ouverte au technicien alors
// qu'Express exécutait la recherche de garantie, donc les ventes.
describe("la casse d'une adresse ne contourne pas les droits", () => {
  it("le technicien reçoit 403 sur la recherche de garantie écrite en majuscules ou avec une barre finale", async () => {
    const { agent } = await loginAs("technician", "tech3@test.dz");
    for (const path of ["/admin/repairs/WARRANTY", "/admin/repairs/Warranty/", "/admin/repairs/warranty/"]) {
      expect((await agent.get(path).query({ phone: "0550123456" })).status, path).toBe(403);
    }
  });

  it("le vendeur garde la recherche de garantie, quelle que soit la casse", async () => {
    const { agent } = await loginAs("seller", "seller3@test.dz");
    for (const path of ["/admin/repairs/warranty", "/admin/repairs/WARRANTY"]) {
      expect((await agent.get(path).query({ phone: "0550123456" })).status, path).toBe(200);
    }
  });
});
