import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { loginAs, resetDb } from "./helpers.js";

// Les pièces de l'atelier (18/11, étape 1) : le stock, les arrivages (prix d'achat moyen) et les corrections.
beforeEach(resetDb);

const admin = async () => (await loginAs("admin", `admin${Math.random()}@test.dz`)).agent;
const battery = { name: "Batterie iPhone 13", purchasePrice: 3_500, salePrice: 6_000 };

async function createPart(agent: Awaited<ReturnType<typeof admin>>, over: Record<string, unknown> = {}) {
  const response = await agent.post("/admin/parts").send({ ...battery, ...over });
  expect(response.status, JSON.stringify(response.body)).toBe(201);
  return response.body.data as { id: number; name: string; purchasePrice: number; salePrice: number; stock: number };
}

describe("POST /admin/parts", () => {
  it("crée une pièce, et un stock de départ écrit un arrivage", async () => {
    const agent = await admin();
    const part = await createPart(agent, { stock: 2 });
    expect(part).toMatchObject({ name: "Batterie iPhone 13", purchasePrice: 3_500, salePrice: 6_000, stock: 2 });
    const movements = (await agent.get(`/admin/parts/${part.id}/movements`).expect(200)).body.data;
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({ kind: "arrival", delta: 2, unitCost: 3_500, stockAfter: 2 });
  });

  it("sans stock de départ, aucun mouvement", async () => {
    const agent = await admin();
    const part = await createPart(agent);
    expect(part.stock).toBe(0);
    expect((await agent.get(`/admin/parts/${part.id}/movements`).expect(200)).body.data).toEqual([]);
  });

  it("refuse un nom vide, un prix hors bornes, un texte à la place d'un nombre", async () => {
    const agent = await admin();
    for (const bad of [{ name: "  " }, { purchasePrice: 10_000_001 }, { salePrice: -1 }, { purchasePrice: "abc" }, { salePrice: 12.5 }, { stock: -1 }]) {
      expect((await agent.post("/admin/parts").send({ ...battery, ...bad })).status, JSON.stringify(bad)).toBe(400);
    }
  });

  it("refuse un doublon de nom à la casse et aux espaces près, avec un message lisible", async () => {
    const agent = await admin();
    await createPart(agent);
    const response = await agent.post("/admin/parts").send({ ...battery, name: "  batterie IPHONE 13 " });
    expect(response.status).toBe(409);
    expect(response.body.error.message).toBe("Une pièce porte déjà ce nom");
  });
});

// Deux espaces au milieu ou une espace insécable collée depuis un site fournisseur donneraient deux cartes au même
// titre à l'écran (le HTML fusionne les espaces) : le nom est rangé avec des espaces simples.
describe("les espaces d'un nom", () => {
  it("un nom aux espaces multiples ou insécables est le même qu'avec des espaces simples", async () => {
    const agent = await admin();
    await createPart(agent);
    const response = await agent.post("/admin/parts").send({ ...battery, name: "Batterie   iPhone 13" });
    expect(response.status).toBe(409);
  });

  it("range le nom avec des espaces simples", async () => {
    const agent = await admin();
    const part = await createPart(agent, { name: "  Écran   iPhone 13 " });
    expect(part.name).toBe("Écran iPhone 13");
    const renamed = await agent.patch(`/admin/parts/${part.id}`).send({ name: "Écran  iPhone  14" }).expect(200);
    expect(renamed.body.data.name).toBe("Écran iPhone 14");
  });
});

describe("PATCH /admin/parts/:id", () => {
  it("change le nom et les prix sans toucher au stock ni au journal", async () => {
    const agent = await admin();
    const part = await createPart(agent, { stock: 3 });
    const response = await agent.patch(`/admin/parts/${part.id}`).send({ name: "Batterie iPhone 13 Pro", salePrice: 6_500, purchasePrice: 3_000 }).expect(200);
    expect(response.body.data).toMatchObject({ name: "Batterie iPhone 13 Pro", salePrice: 6_500, purchasePrice: 3_000, stock: 3 });
    expect((await agent.get(`/admin/parts/${part.id}/movements`).expect(200)).body.data).toHaveLength(1);
  });

  it("répond 404 pour une pièce inconnue", async () => {
    expect((await (await admin()).patch("/admin/parts/999").send({ name: "X" })).status).toBe(404);
  });
});

describe("POST /admin/parts/:id/arrivals", () => {
  it("augmente le stock et moyenne le prix d'achat : 2 à 3 500 plus 2 à 0 donnent 4 à 1 750", async () => {
    const agent = await admin();
    const part = await createPart(agent, { stock: 2 });
    const response = await agent.post(`/admin/parts/${part.id}/arrivals`).send({ quantity: 2, unitCost: 0 }).expect(200);
    expect(response.body.data).toMatchObject({ stock: 4, purchasePrice: 1_750 });
    const [latest] = (await agent.get(`/admin/parts/${part.id}/movements`).expect(200)).body.data;
    expect(latest).toMatchObject({ kind: "arrival", delta: 2, unitCost: 0, stockAfter: 4 });
  });

  it("sur une pièce sans stock, le prix devient celui de l'arrivage", async () => {
    const agent = await admin();
    const part = await createPart(agent);
    const response = await agent.post(`/admin/parts/${part.id}/arrivals`).send({ quantity: 3, unitCost: 2_800 }).expect(200);
    expect(response.body.data).toMatchObject({ stock: 3, purchasePrice: 2_800 });
  });

  it("deux arrivages simultanés s'additionnent sans rien perdre", async () => {
    const agent = await admin();
    const part = await createPart(agent);
    await Promise.all([
      agent.post(`/admin/parts/${part.id}/arrivals`).send({ quantity: 1, unitCost: 3_500 }).expect(200),
      agent.post(`/admin/parts/${part.id}/arrivals`).send({ quantity: 1, unitCost: 3_500 }).expect(200),
    ]);
    expect((await prisma.part.findUniqueOrThrow({ where: { id: part.id } })).stock).toBe(2);
    const movements = (await agent.get(`/admin/parts/${part.id}/movements`).expect(200)).body.data;
    expect(movements.map((movement: { stockAfter: number }) => movement.stockAfter).sort()).toEqual([1, 2]);
  });

  it("refuse une quantité ou un prix hors bornes", async () => {
    const agent = await admin();
    const part = await createPart(agent);
    for (const bad of [{ quantity: 0, unitCost: 1 }, { quantity: 10_001, unitCost: 1 }, { quantity: 1, unitCost: -1 }, { quantity: 1, unitCost: 10_000_001 }, { quantity: "x", unitCost: 1 }]) {
      expect((await agent.post(`/admin/parts/${part.id}/arrivals`).send(bad)).status, JSON.stringify(bad)).toBe(400);
    }
  });
});

describe("POST /admin/parts/:id/corrections", () => {
  it("fixe le stock compté et écrit l'écart : de 4 à 3, un mouvement de −1", async () => {
    const agent = await admin();
    const part = await createPart(agent, { stock: 4 });
    const response = await agent.post(`/admin/parts/${part.id}/corrections`).send({ stock: 3, note: "Une batterie cassée" }).expect(200);
    expect(response.body.data.stock).toBe(3);
    const [latest] = (await agent.get(`/admin/parts/${part.id}/movements`).expect(200)).body.data;
    expect(latest).toMatchObject({ kind: "correction", delta: -1, stockAfter: 3, note: "Une batterie cassée" });
  });

  it("refuse un stock négatif et laisse le stock tel quel", async () => {
    const agent = await admin();
    const part = await createPart(agent, { stock: 2 });
    expect((await agent.post(`/admin/parts/${part.id}/corrections`).send({ stock: -1 })).status).toBe(400);
    expect((await prisma.part.findUniqueOrThrow({ where: { id: part.id } })).stock).toBe(2);
  });

  it("refuse une correction sans écart, en disant le stock", async () => {
    const agent = await admin();
    const part = await createPart(agent, { stock: 2 });
    const response = await agent.post(`/admin/parts/${part.id}/corrections`).send({ stock: 2 });
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Le stock est déjà de 2");
  });
});

describe("GET /admin/parts/:id/movements", () => {
  it("liste les mouvements du plus récent au plus ancien", async () => {
    const agent = await admin();
    const part = await createPart(agent, { stock: 1 });
    await agent.post(`/admin/parts/${part.id}/arrivals`).send({ quantity: 2, unitCost: 3_500 }).expect(200);
    await agent.post(`/admin/parts/${part.id}/corrections`).send({ stock: 2 }).expect(200);
    const movements = (await agent.get(`/admin/parts/${part.id}/movements`).expect(200)).body.data;
    expect(movements.map((movement: { stockAfter: number }) => movement.stockAfter)).toEqual([2, 3, 1]);
  });
});

describe("GET /admin/parts", () => {
  it("trie par nom et trouve une pièce sans tenir compte des accents ni de la casse", async () => {
    const agent = await admin();
    await createPart(agent, { name: "Écran iPhone 13" });
    await createPart(agent, { name: "Batterie iPhone 13" });
    const names = async (q: string) => (await agent.get(`/admin/parts?q=${encodeURIComponent(q)}`).expect(200)).body.data.map((part: { name: string }) => part.name);
    expect(await names("")).toEqual(["Batterie iPhone 13", "Écran iPhone 13"]);
    expect(await names("ecran")).toEqual(["Écran iPhone 13"]);
    expect(await names("BATTERIE")).toEqual(["Batterie iPhone 13"]);
    expect(await names("iphone")).toHaveLength(2);
    expect(await names("rien")).toEqual([]);
  });
});

// Depuis l'étape 5 : le vendeur et le responsable lisent la liste (sans prix d'achat), le reste leur est fermé ; le
// détail par rôle est dans repairRoles.test.ts. L'admin seul modifie une pièce et corrige un stock.
describe("les droits des pièces", () => {
  const routes: [string, string, object][] = [
    ["get", "/admin/parts", {}],
    ["post", "/admin/parts", battery],
    ["patch", "/admin/parts/1", { name: "X" }],
    ["post", "/admin/parts/1/arrivals", { quantity: 1, unitCost: 1 }],
    ["post", "/admin/parts/1/corrections", { stock: 1 }],
    ["get", "/admin/parts/1/movements", {}],
  ];

  it.each(["seller", "order_manager"] as const)("le %s reçoit 403 sur chaque route sauf la liste", async (role) => {
    const { agent } = await loginAs(role, `${role}@test.dz`);
    for (const [method, url, body] of routes) {
      const response = await (agent as unknown as Record<string, (path: string) => request.Test>)[method](url).send(body);
      expect(response.status, `${method} ${url}`).toBe(method === "get" && url === "/admin/parts" ? 200 : 403);
    }
  });

  it("un anonyme reçoit 401 sur chaque route", async () => {
    for (const [method, url, body] of routes) {
      const response = await (request(app) as unknown as Record<string, (path: string) => request.Test>)[method](url).send(body);
      expect(response.status, `${method} ${url}`).toBe(401);
    }
  });
});
