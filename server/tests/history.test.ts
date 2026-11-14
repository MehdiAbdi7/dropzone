import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import type { MovementKind, OrderType, PaymentMethod } from "../src/generated/prisma/client.js";
import { createCatalog, loginAs, previewThenOrder, resetDb } from "./helpers.js";

// L'historique par période (15/11, lot 2) : l'argent à sa date d'encaissement, les ventes et le
// bénéfice à la date de la vente, les caisses, les traces.
const at = (algiers: string) => new Date(`${algiers}+01:00`);
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

beforeEach(async () => {
  await resetDb();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at("2026-11-20T10:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

let counter = 0;
// Une commande insérée directement : le service d'historique ne lit que la base.
async function makeOrder(opts: {
  date: string;
  type?: OrderType;
  fullName?: string;
  lines?: { unitPrice: number; unitCost: number | null; quantity?: number; listPrice?: number | null }[];
  shippingFee?: number;
  status?: "pending" | "picked_up" | "reserved" | "delivered";
}) {
  counter += 1;
  const lines = opts.lines ?? [{ unitPrice: 100, unitCost: 80 }];
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * (line.quantity ?? 1), 0);
  const type = opts.type ?? "pickup";
  return prisma.order.create({
    data: {
      fullName: opts.fullName ?? `Client ${counter}`,
      phone: "0555123456",
      type,
      // Les contraintes de la base : une livraison a son adresse, un retrait son créneau.
      ...(type === "delivery" ? { wilaya: "16 - Alger", commune: "Kouba", address: "Rue 1" } : {}),
      ...(type === "pickup"
        ? { pickupDate: day(opts.date), pickupTime: "15:00", reservedUntil: at(`${opts.date}T23:59`) }
        : {}),
      status: opts.status ?? "picked_up",
      dailyNumber: counter,
      businessDate: day(opts.date),
      createdAt: at(`${opts.date}T10:00`),
      subtotal,
      shippingFee: opts.shippingFee ?? 0,
      total: subtotal + (opts.shippingFee ?? 0),
      items: {
        create: lines.map((line, index) => ({
          sku: `SKU-${counter}-${index}`,
          name: "Article",
          unitPrice: line.unitPrice,
          quantity: line.quantity ?? 1,
          unitCost: line.unitCost,
          listPrice: line.listPrice ?? null,
          isGift: line.unitPrice === 0,
        })),
      },
    },
  });
}

const pay = (orderId: number | null, date: string, amount: number, method: PaymentMethod = "cash", kind: MovementKind = "pickup") =>
  prisma.moneyMovement.create({ data: { orderId, businessDate: day(date), amount, method, kind } });

const history = (agent: ReturnType<typeof request.agent>, from: string, to: string, extra = "") =>
  agent.get(`/admin/history?from=${from}&to=${to}${extra}`);

describe("GET /admin/history", () => {
  it("additionne l'argent par moyen et par nature, chaque mouvement à sa propre date", async () => {
    const { agent } = await loginAs("admin");
    const a = await makeOrder({ date: "2026-11-10" });
    const b = await makeOrder({ date: "2026-11-11" });
    await pay(a.id, "2026-11-10", 100, "cash");
    await pay(b.id, "2026-11-11", 50, "card");
    // Une correction négative compte le jour où elle est écrite (le 12), pas le jour de la vente.
    await pay(a.id, "2026-11-12", -30, "cash", "correction");

    const { totals } = (await history(agent, "2026-11-10", "2026-11-12")).body.data;
    expect(totals.collected).toBe(120);
    expect(totals.byMethod).toMatchObject({ cash: 70, card: 50, ccp: 0 });
    expect(totals.byKind).toMatchObject({ pickup: 150, correction: -30, sale: 0 });

    const onlyTenth = (await history(agent, "2026-11-10", "2026-11-10")).body.data.totals;
    expect(onlyTenth.collected).toBe(100);
  });

  it("compte la vente à la date du paiement : réservée le 12, payée le 14", async () => {
    const { agent } = await loginAs("admin");
    const order = await makeOrder({ date: "2026-11-12" });
    await pay(order.id, "2026-11-14", 100);

    const twelfth = (await history(agent, "2026-11-12", "2026-11-12")).body.data;
    expect(twelfth.totals).toMatchObject({ collected: 0, salesCount: 0, profit: 0 });
    expect(twelfth.orders.map((o: { id: number }) => o.id)).toEqual([order.id]);

    const fourteenth = (await history(agent, "2026-11-14", "2026-11-14")).body.data;
    expect(fourteenth.totals).toMatchObject({ collected: 100, salesCount: 1, profit: 20 });
    expect(fourteenth.orders).toHaveLength(1);
    expect(fourteenth.orders[0]).toMatchObject({ id: order.id, paid: 100, saleDate: "2026-11-14", cashedOn: ["2026-11-14"] });
  });

  it("calcule le bénéfice : cadeaux comptés, livraison exclue, prix d'achat inconnu mis à part", async () => {
    const { agent } = await loginAs("admin");
    // 2 × (100 − 80) = 40, frais de livraison ignorés.
    const simple = await makeOrder({ date: "2026-11-10", type: "delivery", lines: [{ unitPrice: 100, unitCost: 80, quantity: 2 }], shippingFee: 600 });
    // 20 − le cadeau qui coûte 10 = 10.
    const withGift = await makeOrder({ date: "2026-11-10", lines: [{ unitPrice: 100, unitCost: 80 }, { unitPrice: 0, unitCost: 10 }] });
    const unknown = await makeOrder({ date: "2026-11-10", lines: [{ unitPrice: 100, unitCost: null }] });
    await pay(simple.id, "2026-11-10", 800, "cash", "delivery");
    await pay(withGift.id, "2026-11-10", 100);
    await pay(unknown.id, "2026-11-10", 100);

    const data = (await history(agent, "2026-11-10", "2026-11-10")).body.data;
    expect(data.totals).toMatchObject({ salesCount: 3, profit: 50, unknownCostSales: 1 });
    const byId = new Map(data.orders.map((o: { id: number; profit: number | null }) => [o.id, o.profit]));
    expect(byId.get(simple.id)).toBe(40);
    expect(byId.get(withGift.id)).toBe(10);
    expect(byId.get(unknown.id)).toBeNull();
  });

  it("n'inclut pas dans les ventes une commande supprimée ni un simple mouvement de correction", async () => {
    const { agent } = await loginAs("admin");
    await pay(null, "2026-11-10", 100, "cash", "pickup");
    const real = await makeOrder({ date: "2026-11-10" });
    await pay(real.id, "2026-11-10", 100);
    await pay(real.id, "2026-11-11", -10, "cash", "correction");
    const data = (await history(agent, "2026-11-10", "2026-11-11")).body.data;
    expect(data.totals.salesCount).toBe(1);
  });

  it("classe au bon jour à minuit heure d'Alger (23h59 et 00h01)", async () => {
    const admin = await loginAs("admin");
    await createCatalog();
    vi.setSystemTime(at("2026-11-14T10:00"));
    const reserve = async (pickupDate: string) => {
      const placed = await previewThenOrder([{ sku: "CHG-20W", quantity: 1 }], { fulfillment: "pickup", pickupDate, pickupTime: "15:00" });
      expect(placed.status).toBe(201);
      return prisma.order.findUniqueOrThrow({ where: { number: placed.body.data.number } });
    };
    const first = await reserve("2026-11-14");
    const second = await reserve("2026-11-15");
    await admin.agent.post("/admin/cash/open").send({ openingFloat: 0 }).expect(201);
    vi.setSystemTime(at("2026-11-14T23:59"));
    await admin.agent.post(`/admin/orders/${first.id}/pickup`).send({ method: "cash" }).expect(200);
    vi.setSystemTime(at("2026-11-15T00:01"));
    await admin.agent.post("/admin/cash/open").send({ openingFloat: 0 }).expect(201);
    await admin.agent.post(`/admin/orders/${second.id}/pickup`).send({ method: "cash" }).expect(200);

    const fourteenth = (await history(admin.agent, "2026-11-14", "2026-11-14")).body.data.totals;
    const fifteenth = (await history(admin.agent, "2026-11-15", "2026-11-15")).body.data.totals;
    expect(fourteenth.collected).toBe(first.total);
    expect(fifteenth.collected).toBe(second.total);
  });

  it("refuse une période invalide : from après to, plus de 366 jours, date qui n'existe pas, paramètre absent", async () => {
    const { agent } = await loginAs("admin");
    expect((await history(agent, "2026-11-12", "2026-11-10")).status).toBe(400);
    expect((await history(agent, "2025-11-01", "2026-11-03")).status).toBe(400);
    expect((await history(agent, "2026-02-30", "2026-03-02")).status).toBe(400);
    expect((await agent.get("/admin/history?from=2026-11-10")).status).toBe(400);
    expect((await history(agent, "2025-11-14", "2026-11-14")).status).toBe(200);
  });

  it("donne les caisses de la période avec l'écart, et omet un jour sans mouvement ni caisse", async () => {
    const { agent } = await loginAs("admin");
    await prisma.cashDay.create({ data: { date: day("2026-11-10"), openingFloat: 10_000, countedCash: 254_000, closedAt: at("2026-11-10T20:00") } });
    await pay(null, "2026-11-10", 245_000);
    await pay(null, "2026-11-12", 500, "card");

    const { days } = (await history(agent, "2026-11-09", "2026-11-13")).body.data;
    expect(days.map((d: { date: string }) => d.date)).toEqual(["2026-11-12", "2026-11-10"]);
    expect(days[1]).toMatchObject({ collected: 245_000, cashDay: { openingFloat: 10_000, countedCash: 254_000, gap: -1_000, closed: true } });
    expect(days[0].cashDay).toBeNull();
  });

  it("garde 500 commandes au plus et le dit", async () => {
    const { agent } = await loginAs("admin");
    await prisma.order.createMany({
      data: Array.from({ length: 501 }, (_, index) => ({
        fullName: "Client Masse",
        phone: "0555123456",
        type: "in_store" as const,
        dailyNumber: index + 1,
        businessDate: day("2026-11-10"),
        createdAt: at("2026-11-10T10:00"),
        subtotal: 100,
        shippingFee: 0,
        total: 100,
      })),
    });
    const data = (await history(agent, "2026-11-10", "2026-11-10")).body.data;
    expect(data.orders).toHaveLength(500);
    expect(data.ordersTruncated).toBe(true);
    expect((await history(agent, "2026-11-11", "2026-11-11")).body.data.ordersTruncated).toBe(false);
  });

  it("filtre par type et par recherche", async () => {
    const { agent } = await loginAs("admin");
    const delivery = await makeOrder({ date: "2026-11-10", type: "delivery", fullName: "Karim Livré" });
    await makeOrder({ date: "2026-11-10", type: "pickup", fullName: "Sofia Retrait" });
    const byType = (await history(agent, "2026-11-10", "2026-11-10", "&type=delivery")).body.data.orders;
    expect(byType.map((o: { id: number }) => o.id)).toEqual([delivery.id]);
    const byName = (await history(agent, "2026-11-10", "2026-11-10", "&q=sofia")).body.data.orders;
    expect(byName).toHaveLength(1);
    expect(byName[0].fullName).toBe("Sofia Retrait");
  });

  it("liste les modifications et suppressions de la période avec le nom de l'admin", async () => {
    await createCatalog();
    vi.setSystemTime(at("2026-11-14T10:00"));
    const placed = await previewThenOrder([{ sku: "CHG-20W", quantity: 1 }]);
    const order = await prisma.order.findUniqueOrThrow({ where: { number: placed.body.data.number } });
    const { agent } = await loginAs("admin");
    await agent.delete(`/admin/orders/${order.id}`).expect(200);

    const { changes } = (await history(agent, "2026-11-14", "2026-11-14")).body.data;
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ kind: "deleted", orderNumber: order.number, userName: "Amine Test" });
    expect((await history(agent, "2026-11-15", "2026-11-15")).body.data.changes).toHaveLength(0);
  });

  it("est réservé à l'admin", async () => {
    expect((await request(app).get("/admin/history?from=2026-11-10&to=2026-11-10")).status).toBe(401);
    const { agent } = await loginAs("customer");
    expect((await history(agent, "2026-11-10", "2026-11-10")).status).toBe(403);
  });
});

describe("les réductions (lot 3)", () => {
  it("montre la réduction de chaque commande et son total sur la période", async () => {
    const { agent } = await loginAs("admin");
    const negotiated = await makeOrder({ date: "2026-11-10", lines: [{ unitPrice: 290_000, unitCost: 250_000, listPrice: 299_000 }] });
    const plain = await makeOrder({ date: "2026-11-10", lines: [{ unitPrice: 100, unitCost: 80, listPrice: 100 }] });
    const old = await makeOrder({ date: "2026-11-10", lines: [{ unitPrice: 500, unitCost: 400 }] });
    for (const order of [negotiated, plain, old]) await pay(order.id, "2026-11-10", order.total);

    const data = (await history(agent, "2026-11-10", "2026-11-10")).body.data;
    const discountOf = (id: number) => data.orders.find((order: { id: number }) => order.id === id).discount;
    expect(discountOf(negotiated.id)).toBe(9_000);
    expect(discountOf(plain.id)).toBe(0);
    expect(discountOf(old.id)).toBe(0);
    expect(data.totals.discount).toBe(9_000);
  });

  it("compte une réduction au jour de la vente, comme le bénéfice", async () => {
    const { agent } = await loginAs("admin");
    const order = await makeOrder({ date: "2026-11-10", lines: [{ unitPrice: 290_000, unitCost: 250_000, listPrice: 299_000 }] });
    await pay(order.id, "2026-11-12", order.total);
    expect((await history(agent, "2026-11-10", "2026-11-11")).body.data.totals.discount).toBe(0);
    expect((await history(agent, "2026-11-12", "2026-11-12")).body.data.totals.discount).toBe(9_000);
  });
});

describe("après la relecture", () => {
  it("répond 400, jamais 500, à une date mal formée ou impossible", async () => {
    const { agent } = await loginAs("admin");
    for (const from of ["abc", "2026-13-01", "2026-02-32", "20261101"]) {
      expect((await history(agent, from, "2026-11-10")).status, `from=${from}`).toBe(400);
    }
    expect((await history(agent, "2026-11-01", "pas-une-date")).status).toBe(400);
  });

  it("accepte 366 jours et refuse 367", async () => {
    const { agent } = await loginAs("admin");
    expect((await history(agent, "2025-11-14", "2026-11-14")).status).toBe(200);
    expect((await history(agent, "2025-11-13", "2026-11-14")).status).toBe(400);
  });

  it("range une modification à minuit heure d'Alger dans le bon jour", async () => {
    const { agent } = await loginAs("admin");
    await prisma.orderEvent.create({ data: { kind: "edited", orderNumber: 1001, summary: "avant minuit", createdAt: at("2026-11-14T23:30") } });
    await prisma.orderEvent.create({ data: { kind: "edited", orderNumber: 1002, summary: "après minuit", createdAt: at("2026-11-15T00:30") } });
    const summaries = async (day: string) =>
      (await history(agent, day, day)).body.data.changes.map((change: { summary: string }) => change.summary);
    expect(await summaries("2026-11-14")).toEqual(["avant minuit"]);
    expect(await summaries("2026-11-15")).toEqual(["après minuit"]);
  });
});
