import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/config/db.js";
import type { OrderType } from "../src/generated/prisma/client.js";
import { loginAs, resetDb } from "./helpers.js";

// L'historique par onglet (17/11, lot 4) : Total, Magasin, Livraisons, Réservations. Chaque onglet
// dit ce qu'il rapporte (argent encaissé, ventes, bénéfice) ; le Total additionne les trois. L'argent
// d'une livraison compte le jour où il est ARRIVÉ, et ne touche jamais l'écart de la caisse.
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
async function makeOrder(type: OrderType, date: string, unitPrice: number, unitCost: number) {
  counter += 1;
  return prisma.order.create({
    data: {
      fullName: `Client ${counter}`,
      phone: "0555123456",
      type,
      ...(type === "delivery" ? { wilaya: "16 - Alger", commune: "Kouba", address: "Rue 1" } : {}),
      ...(type === "pickup" ? { pickupDate: day(date), pickupTime: "15:00", reservedUntil: at(`${date}T23:59`) } : {}),
      status: type === "delivery" ? "collected" : "picked_up",
      dailyNumber: counter,
      businessDate: day(date),
      createdAt: at(`${date}T10:00`),
      subtotal: unitPrice,
      shippingFee: 0,
      total: unitPrice,
      items: { create: [{ sku: `SKU-${counter}`, name: "Article", unitPrice, quantity: 1, unitCost }] },
    },
  });
}

const pay = (
  orderId: number,
  orderType: OrderType,
  date: string,
  amount: number,
  kind: "sale" | "pickup" | "delivery" | "correction",
  method: "cash" | "ccp" = "cash",
) => prisma.moneyMovement.create({ data: { orderId, orderType, businessDate: day(date), amount, method, kind } });

async function seed() {
  const store = await makeOrder("in_store", "2026-11-10", 100, 80);
  await pay(store.id, "in_store", "2026-11-10", 100, "sale");
  const pickup = await makeOrder("pickup", "2026-11-10", 200, 160);
  await pay(pickup.id, "pickup", "2026-11-10", 200, "pickup");
  // Commandée le 9, l'argent n'arrive que le 12.
  const delivery = await makeOrder("delivery", "2026-11-09", 300, 250);
  await pay(delivery.id, "delivery", "2026-11-12", 300, "delivery", "ccp");
  return { store, pickup, delivery };
}

const history = async (query: string) => {
  // Un compte différent à chaque appel : le courriel d'un compte est unique.
  const { agent } = await loginAs("admin", `admin${Math.random()}@test.dz`);
  return (await agent.get(`/admin/history?${query}`)).body.data;
};

describe("l'historique par onglet", () => {
  it("le total additionne les trois onglets, et chaque canal dit ce qu'il rapporte", async () => {
    await seed();
    const data = await history("from=2026-11-09&to=2026-11-12");
    expect(data.totals).toMatchObject({ collected: 600, salesCount: 3, profit: 20 + 40 + 50 });
    expect(data.channels).toEqual({
      in_store: { collected: 100, salesCount: 1, profit: 20, unknownCostSales: 0, discount: 0 },
      delivery: { collected: 300, salesCount: 1, profit: 50, unknownCostSales: 0, discount: 0 },
      pickup: { collected: 200, salesCount: 1, profit: 40, unknownCostSales: 0, discount: 0 },
    });
  });

  it("chaque onglet filtre l'argent, les jours, les ventes, le bénéfice et les commandes", async () => {
    const { store, pickup, delivery } = await seed();
    const deliveries = await history("from=2026-11-09&to=2026-11-12&type=delivery");
    expect(deliveries.totals).toMatchObject({ collected: 300, salesCount: 1, profit: 50 });
    expect(deliveries.totals.byMethod).toMatchObject({ ccp: 300, cash: 0 });
    expect(deliveries.days.map((d: { date: string; collected: number }) => [d.date, d.collected])).toEqual([["2026-11-12", 300]]);
    expect(deliveries.orders.map((o: { id: number }) => o.id)).toEqual([delivery.id]);

    const stores = await history("from=2026-11-09&to=2026-11-12&type=in_store");
    expect(stores.totals).toMatchObject({ collected: 100, salesCount: 1, profit: 20 });
    expect(stores.orders.map((o: { id: number }) => o.id)).toEqual([store.id]);

    const reservations = await history("from=2026-11-09&to=2026-11-12&type=pickup");
    expect(reservations.totals).toMatchObject({ collected: 200, salesCount: 1, profit: 40 });
    expect(reservations.orders.map((o: { id: number }) => o.id)).toEqual([pickup.id]);
    // Les canaux restent ceux de tout le monde, quel que soit l'onglet choisi.
    expect(reservations.channels.delivery.collected).toBe(300);
  });

  it("l'argent d'une livraison compte le jour d'encaissement, pas celui de la commande", async () => {
    await seed();
    const onOrderDay = await history("from=2026-11-09&to=2026-11-09&type=delivery");
    expect(onOrderDay.totals).toMatchObject({ collected: 0, salesCount: 0, profit: 0 });
    const onCollectDay = await history("from=2026-11-12&to=2026-11-12&type=delivery");
    expect(onCollectDay.totals).toMatchObject({ collected: 300, salesCount: 1, profit: 50 });
  });

  it("une correction de livraison se retranche à sa date, dans l'onglet Livraisons", async () => {
    const { delivery } = await seed();
    await pay(delivery.id, "delivery", "2026-11-13", -300, "correction", "ccp");
    const deliveries = await history("from=2026-11-12&to=2026-11-13&type=delivery");
    expect(deliveries.totals.collected).toBe(0);
    expect(deliveries.days.map((d: { date: string; collected: number }) => [d.date, d.collected])).toEqual([
      ["2026-11-13", -300],
      ["2026-11-12", 300],
    ]);
    const stores = await history("from=2026-11-12&to=2026-11-13&type=in_store");
    expect(stores.totals.collected).toBe(0);
  });

  it("l'écart de la caisse ignore l'argent des livraisons arrivé le même jour", async () => {
    await seed();
    await prisma.cashDay.create({ data: { date: day("2026-11-12"), openingFloat: 1000, countedCash: 1000, closedAt: at("2026-11-12T21:00") } });
    // Le 12, 300 DA de livraison sont arrivés par CCP ; on aurait pu les mettre en espèces aussi.
    await pay((await prisma.order.findFirstOrThrow({ where: { type: "delivery" } })).id, "delivery", "2026-11-12", 50, "delivery", "cash");
    const data = await history("from=2026-11-12&to=2026-11-12");
    const [row] = data.days;
    expect(row.date).toBe("2026-11-12");
    expect(row.collected).toBe(350);
    expect(row.cashDay).toMatchObject({ openingFloat: 1000, countedCash: 1000, gap: 0 });
  });

  it("refuse un onglet inconnu", async () => {
    const { agent } = await loginAs("admin");
    expect((await agent.get("/admin/history?from=2026-11-09&to=2026-11-12&type=autre")).status).toBe(400);
  });
});
