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
