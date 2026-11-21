import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { algiersDate } from "../src/utils/algiersTime.js";
import { warrantyEndDate } from "../src/modules/repairs/warranty.js";
import { loginAs, partCategoryId, resetDb } from "./helpers.js";

// Les fiches de réparation (18/11, étape 2) : création au comptoir, liste par étape, détail, modification.
beforeEach(resetDb);

const admin = async () => (await loginAs("admin", `admin${Math.random()}@test.dz`)).agent;
type Agent = Awaited<ReturnType<typeof admin>>;

const body = {
  fullName: "Karim Benali",
  phone: "0550 12 34 56",
  deviceName: "iPhone 13",
  deviceColor: "Bleu",
  deviceState: "Écran fissuré",
  issue: "L'écran ne s'allume plus",
  accessories: "Coque",
};

async function create(agent: Agent, over: Record<string, unknown> = {}) {
  const response = await agent.post("/admin/repairs").send({ ...body, ...over });
  expect(response.status, JSON.stringify(response.body)).toBe(201);
  return response.body.data;
}

// La vente d'origine d'un appareil, à une date donnée.
async function sell(createdAt: Date, months: number | null = 12) {
  const order = await prisma.order.create({
    data: {
      fullName: "Karim Benali",
      phone: "0550123456",
      type: "in_store",
      status: "picked_up",
      dailyNumber: 1,
      businessDate: new Date("2026-11-18"),
      subtotal: 80_000,
      shippingFee: 0,
      total: 80_000,
      createdAt,
      items: { create: [{ sku: "IP13-128", name: "iPhone 13", unitPrice: 80_000, quantity: 1, warrantyMonths: months }] },
    },
    select: { number: true, items: { select: { id: true } } },
  });
  return { itemId: order.items[0].id, orderNumber: order.number };
}

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);

describe("POST /admin/repairs", () => {
  it("crée une fiche hors garantie sans commande d'origine", async () => {
    const agent = await admin();
    const repair = await create(agent);
    expect(repair).toMatchObject({
      number: 1001,
      status: "received",
      fullName: "Karim Benali",
      phone: "0550123456",
      deviceName: "iPhone 13",
      underWarranty: false,
      warrantyEndsAt: null,
      warrantyForcedOff: false,
      originOrderNumber: null,
      laborPrice: null,
      parts: [],
      nextStatuses: ["quote", "in_repair"],
    });
    expect(repair.events).toHaveLength(1);
    expect(repair.events[0].status).toBe("received");
  });

  it("numérote 1001, 1002, sans confondre avec le compteur des commandes", async () => {
    const agent = await admin();
    await sell(daysAgo(1));
    const first = await create(agent);
    const second = await create(agent);
    expect([first.number, second.number]).toEqual([1001, 1002]);
  });

  it("refuse un nom trop court, un téléphone invalide, une panne vide, une main-d'œuvre fausse", async () => {
    const agent = await admin();
    const bad = [
      { fullName: "Ka" },
      { phone: "123" },
      { deviceName: "i" },
      { issue: "  " },
      { laborPrice: -1 },
      { laborPrice: 12.5 },
      { laborPrice: 10_000_001 },
      { laborPrice: "abc" },
      { deviceColor: "x".repeat(301) },
    ];
    for (const over of bad) {
      expect((await agent.post("/admin/repairs").send({ ...body, ...over })).status, JSON.stringify(over)).toBe(400);
    }
  });

  it("ne garde aucun code de déverrouillage", async () => {
    const agent = await admin();
    const repair = await create(agent, { unlockCode: "CODE-7731", passcode: "CODE-7731" });
    expect(JSON.stringify(repair)).not.toContain("CODE-7731");
    const [row] = await prisma.$queryRaw<Record<string, unknown>[]>`SELECT * FROM repairs`;
    expect(JSON.stringify(row)).not.toContain("CODE-7731");
  });

  it("sous garantie : la garantie est recalculée depuis l'article d'origine", async () => {
    const agent = await admin();
    const soldAt = daysAgo(90);
    const sale = await sell(soldAt);
    const repair = await create(agent, { originItemId: sale.itemId });
    expect(repair).toMatchObject({
      underWarranty: true,
      warrantyEndsAt: warrantyEndDate(algiersDate(soldAt), 12),
      originOrderNumber: sale.orderNumber,
      warrantyForcedOff: false,
      nextStatuses: ["in_repair"],
    });
  });

  it("compte la vente au bon jour d'Alger (00 h 30 à Alger, la veille en UTC)", async () => {
    const agent = await admin();
    const sale = await sell(new Date("2026-11-17T23:30:00Z"));
    const repair = await create(agent, { originItemId: sale.itemId });
    expect(repair.warrantyEndsAt).toBe("2027-11-18");
  });

  it("un article dont la garantie est finie donne hors garantie", async () => {
    const agent = await admin();
    const sale = await sell(daysAgo(500));
    const repair = await create(agent, { originItemId: sale.itemId });
    expect(repair).toMatchObject({ underWarranty: false, originOrderNumber: sale.orderNumber });
  });

  it("« forcer hors garantie » gagne, et reste un fait de la fiche", async () => {
    const agent = await admin();
    const sale = await sell(daysAgo(10));
    const repair = await create(agent, { originItemId: sale.itemId, forceOutOfWarranty: true });
    expect(repair).toMatchObject({ underWarranty: false, warrantyForcedOff: true, originOrderNumber: sale.orderNumber });
  });

  it("ignore un underWarranty envoyé par le client", async () => {
    const agent = await admin();
    const repair = await create(agent, { underWarranty: true, warrantyEndsAt: "2030-01-01" });
    expect(repair).toMatchObject({ underWarranty: false, warrantyEndsAt: null });
  });

  it("refuse un article inconnu ou sans garantie", async () => {
    const agent = await admin();
    expect((await agent.post("/admin/repairs").send({ ...body, originItemId: 99999 })).status).toBe(400);
    const sale = await sell(daysAgo(10), null);
    expect((await agent.post("/admin/repairs").send({ ...body, originItemId: sale.itemId })).status).toBe(400);
  });

  it("un anonyme reçoit 401 (les droits par rôle sont dans repairRoles.test.ts)", async () => {
    const request = (await import("supertest")).default;
    const app = (await import("../src/app.js")).default;
    expect((await request(app).get("/admin/repairs")).status).toBe(401);
  });
});

describe("GET /admin/repairs", () => {
  it("par défaut, les fiches en cours : les Rendues n'y sont pas", async () => {
    const agent = await admin();
    const open = await create(agent);
    const done = await create(agent, { fullName: "Autre Client" });
    await prisma.repair.update({ where: { id: done.id }, data: { status: "returned", returnedOn: new Date("2026-11-18T00:00:00Z") } });
    const rows = (await agent.get("/admin/repairs").expect(200)).body.data;
    expect(rows.map((row: { id: number }) => row.id)).toEqual([open.id]);
    expect(rows[0]).toMatchObject({ number: 1001, status: "received", partsCount: 0, total: 0 });
  });

  it("filtre par étape, les plus récentes d'abord", async () => {
    const agent = await admin();
    const a = await create(agent);
    const b = await create(agent);
    await prisma.repair.update({ where: { id: a.id }, data: { status: "ready" } });
    await prisma.repair.update({ where: { id: b.id }, data: { status: "ready" } });
    const rows = (await agent.get("/admin/repairs").query({ stage: "ready" }).expect(200)).body.data;
    expect(rows.map((row: { id: number }) => row.id)).toEqual([b.id, a.id]);
    expect((await agent.get("/admin/repairs").query({ stage: "quote" }).expect(200)).body.data).toEqual([]);
    expect((await agent.get("/admin/repairs").query({ stage: "nimporte" })).status).toBe(400);
  });

  it("les onglets : « new » = Reçu seulement, « ongoing » = tout le reste sauf Rendu", async () => {
    const agent = await admin();
    const received = await create(agent);
    const quote = await create(agent);
    const toReturn = await create(agent);
    const returned = await create(agent);
    await prisma.repair.update({ where: { id: quote.id }, data: { status: "quote" } });
    await prisma.repair.update({ where: { id: toReturn.id }, data: { status: "to_return" } });
    await prisma.repair.update({ where: { id: returned.id }, data: { status: "returned", returnedOn: new Date("2026-11-18T00:00:00Z") } });
    const ids = async (stage: string) => (await agent.get("/admin/repairs").query({ stage }).expect(200)).body.data.map((row: { id: number }) => row.id);
    expect(await ids("new")).toEqual([received.id]);
    expect((await ids("ongoing")).sort()).toEqual([quote.id, toReturn.id].sort());
  });

  it("cherche par numéro (R-1001 ou 1001), nom ou téléphone, sans tenir compte des accents", async () => {
    const agent = await admin();
    await create(agent, { fullName: "Éloïse Merabet", phone: "0661000000" });
    await create(agent, { fullName: "Karim Benali" });
    const ids = async (q: string) => (await agent.get("/admin/repairs").query({ q }).expect(200)).body.data.map((row: { number: number }) => row.number);
    expect(await ids("R-1001")).toEqual([1001]);
    expect(await ids("1002")).toEqual([1002]);
    expect(await ids("eloise")).toEqual([1001]);
    expect(await ids("0661")).toEqual([1001]);
    expect(await ids("benali")).toEqual([1002]);
    expect(await ids("zzz")).toEqual([]);
  });

  it("le total compte les pièces au prix de vente et la main-d'œuvre", async () => {
    const agent = await admin();
    const repair = await create(agent, { laborPrice: 2_000 });
    const part = await prisma.part.create({ data: { name: "Batterie", categoryId: await partCategoryId(), purchasePrice: 3_500, salePrice: 6_000, stock: 5 } });
    await prisma.repairPart.create({ data: { repairId: repair.id, partId: part.id, name: "Batterie", quantity: 2, unitCost: 3_500, unitPrice: 6_000 } });
    const rows = (await agent.get("/admin/repairs").expect(200)).body.data;
    expect(rows[0]).toMatchObject({ partsCount: 1, total: 14_000 });
  });
});

describe("GET /admin/repairs/counts", () => {
  it("donne le nombre de fiches de chaque étape et des fiches en cours", async () => {
    const agent = await admin();
    await create(agent);
    const b = await create(agent);
    const c = await create(agent);
    await prisma.repair.update({ where: { id: b.id }, data: { status: "quote" } });
    await prisma.repair.update({ where: { id: c.id }, data: { status: "returned", returnedOn: new Date("2026-11-18T00:00:00Z") } });
    const counts = (await agent.get("/admin/repairs/counts").expect(200)).body.data;
    expect(counts).toEqual({ open: 2, new: 1, ongoing: 1, received: 1, quote: 1, in_repair: 0, ready: 0, to_return: 0, returned: 1 });
  });
});

describe("GET et PATCH /admin/repairs/:id", () => {
  it("rend le détail complet", async () => {
    const agent = await admin();
    const repair = await create(agent, { laborPrice: 1_500 });
    const detail = (await agent.get(`/admin/repairs/${repair.id}`).expect(200)).body.data;
    expect(detail).toMatchObject({ id: repair.id, issue: "L'écran ne s'allume plus", accessories: "Coque", laborPrice: 1_500, note: null });
  });

  it("404 sur une fiche inconnue", async () => {
    const agent = await admin();
    expect((await agent.get("/admin/repairs/99999")).status).toBe(404);
    expect((await agent.patch("/admin/repairs/99999").send({ note: "x" })).status).toBe(404);
  });

  it("modifie la fiche, la note du technicien et la main-d'œuvre (null l'efface)", async () => {
    const agent = await admin();
    const repair = await create(agent);
    const patched = (
      await agent.patch(`/admin/repairs/${repair.id}`).send({ deviceName: "iPhone 13 Pro", laborPrice: 3_000, note: "Vitre arrière aussi" }).expect(200)
    ).body.data;
    expect(patched).toMatchObject({ deviceName: "iPhone 13 Pro", laborPrice: 3_000, note: "Vitre arrière aussi" });
    const cleared = (await agent.patch(`/admin/repairs/${repair.id}`).send({ laborPrice: null }).expect(200)).body.data;
    expect(cleared.laborPrice).toBeNull();
  });

  it("refuse les valeurs hors bornes", async () => {
    const agent = await admin();
    const repair = await create(agent);
    for (const bad of [{ fullName: "Ka" }, { phone: "1" }, { issue: "" }, { laborPrice: -5 }, { note: "x".repeat(1001) }]) {
      expect((await agent.patch(`/admin/repairs/${repair.id}`).send(bad)).status, JSON.stringify(bad)).toBe(400);
    }
  });

  it("refuse de modifier une fiche rendue", async () => {
    const agent = await admin();
    const repair = await create(agent);
    await prisma.repair.update({ where: { id: repair.id }, data: { status: "returned", returnedOn: new Date("2026-11-18T00:00:00Z") } });
    expect((await agent.patch(`/admin/repairs/${repair.id}`).send({ note: "tard" })).status).toBe(409);
  });
});
