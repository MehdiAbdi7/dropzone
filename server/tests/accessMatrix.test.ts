import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app, { adminRouter } from "../src/app.js";
import { ACCESS_RULES, ROLE_RANK } from "../src/middlewares/access.js";
import type { Role } from "../src/generated/prisma/client.js";
import { loginAs, resetDb } from "./helpers.js";

// Lot 7 : la matrice des droits, essayée sur l'application réelle. Pour chaque règle de la table, un rôle
// plus bas reçoit 403, un rôle égal ou plus haut passe la porte (la réponse peut être 400 ou 404 : seul
// le refus d'accès compte ici).
type Agent = Awaited<ReturnType<typeof loginAs>>["agent"];
const agents = {} as Record<Role, Agent>;

beforeAll(async () => {
  await resetDb();
  for (const role of ["customer", "seller", "order_manager", "admin"] as const) {
    agents[role] = (await loginAs(role, `${role}@matrix.dz`)).agent;
  }
});

const call = (agent: Agent, method: string, path: string) => {
  const url = `/admin${path.replace(/:[^/]+/g, "1")}`;
  const verb = method.toLowerCase() as "get" | "post" | "put" | "patch" | "delete";
  return agent[verb](url).send({});
};

describe("matrice des droits du back-office", () => {
  it.each(ACCESS_RULES.map((rule) => [rule.method, rule.path, rule.min] as const))(
    "%s %s (à partir de %s)",
    async (method, path, min) => {
      for (const role of ["customer", "seller", "order_manager", "admin"] as const) {
        const status = (await call(agents[role], method, path)).status;
        if (ROLE_RANK[role] >= ROLE_RANK[min]) {
          expect([401, 403], `${role} devrait passer`).not.toContain(status);
        } else {
          expect(status, `${role} devrait être refusé`).toBe(403);
        }
      }
    },
  );

  it.each([
    ["GET", "/history"],
    ["GET", "/stats"],
    ["GET", "/customers"],
    ["PATCH", "/orders/1"],
    ["DELETE", "/orders/1"],
    ["POST", "/cash/reopen"],
    ["GET", "/trade-ins"],
    ["GET", "/accounts"],
    ["GET", "/products"],
  ])("%s %s est réservée à l'admin", async (method, path) => {
    expect((await call(agents.seller, method, path)).status).toBe(403);
    expect((await call(agents.order_manager, method, path)).status).toBe(403);
  });

  it("un anonyme reçoit 401 partout", async () => {
    for (const rule of ACCESS_RULES) {
      const url = `/admin${rule.path.replace(/:[^/]+/g, "1")}`;
      const verb = rule.method.toLowerCase() as "get" | "post" | "put" | "patch" | "delete";
      expect((await request(app)[verb](url).send({})).status, `${rule.method} ${rule.path}`).toBe(401);
    }
  });
});

// La table ne ment pas : chaque règle désigne une route qui existe vraiment (une faute de frappe dans
// l'adresse laisserait la vraie route fermée sans que personne le voie).
type Layer = { route?: { path: string; methods: Record<string, boolean> }; handle?: { stack?: Layer[] } };
function listRoutes(stack: Layer[]): string[] {
  return stack.flatMap((layer) => {
    if (layer.route) {
      return Object.keys(layer.route.methods).map((method) => `${method.toUpperCase()} ${layer.route!.path}`);
    }
    return layer.handle?.stack ? listRoutes(layer.handle.stack) : [];
  });
}

describe("la table et les routes enregistrées", () => {
  const registered = listRoutes((adminRouter as unknown as { stack: Layer[] }).stack);

  it("trouve les routes du back-office", () => {
    expect(registered.length).toBeGreaterThan(50);
  });

  it.each(ACCESS_RULES.map((rule) => `${rule.method} ${rule.path}`))("la règle « %s » désigne une vraie route", (key) => {
    expect(registered).toContain(key);
  });
});
