import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { algiersDate } from "../src/utils/algiersTime.js";
import { warrantyEndDate } from "../src/modules/repairs/warranty.js";
import { loginAs, resetDb } from "./helpers.js";

// La garantie d'une réparation (18/11, étape 2) : on retrouve l'article vendu par le téléphone du client ou le
// numéro de la commande, et la fin de garantie se calcule côté serveur.
beforeEach(resetDb);

const admin = async () => (await loginAs("admin", `admin${Math.random()}@test.dz`)).agent;

type Sale = {
  phone?: string;
  status?: "picked_up" | "delivered" | "collected" | "pending" | "cancelled" | "returned" | "reserved";
  type?: "in_store" | "delivery" | "exchange";
  createdAt?: Date;
  months?: number | null;
  isGift?: boolean;
};

// Une vente avec un seul article ; `daysAgo` recule la date de la vente.
async function sell(over: Sale & { daysAgo?: number } = {}) {
  const type = over.type ?? "in_store";
  const createdAt = over.createdAt ?? new Date(Date.now() - (over.daysAgo ?? 0) * 86_400_000);
  const order = await prisma.order.create({
    data: {
      fullName: "Karim Benali",
      phone: over.phone ?? "0550123456",
      type,
      status: over.status ?? "picked_up",
      ...(type === "delivery" ? { wilaya: "Alger", commune: "Kouba", address: "12 rue Test" } : {}),
      dailyNumber: 1,
      businessDate: new Date("2026-11-18"),
      subtotal: 80_000,
      shippingFee: 0,
      total: 80_000,
      createdAt,
      items: {
        create: [
          {
            sku: "IP13-128",
            name: "iPhone 13 128 Go",
            unitPrice: 80_000,
            quantity: 1,
            warrantyMonths: over.months === undefined ? 12 : over.months,
            isGift: over.isGift ?? false,
          },
        ],
      },
    },
    select: { number: true, items: { select: { id: true } } },
  });
  return { orderNumber: order.number, itemId: order.items[0].id, createdAt };
}

describe("GET /admin/repairs/warranty", () => {
  it("retrouve l'article d'une vente au magasin par le téléphone et calcule la fin de garantie", async () => {
    const agent = await admin();
    const sale = await sell({ daysAgo: 90 });
    const hits = (await agent.get("/admin/repairs/warranty").query({ phone: "05 50 12 34 56" }).expect(200)).body.data;
    expect(hits).toHaveLength(1);
    const soldOn = algiersDate(sale.createdAt);
    expect(hits[0]).toMatchObject({
      itemId: sale.itemId,
      orderNumber: sale.orderNumber,
      soldOn,
      name: "iPhone 13 128 Go",
      warrantyMonths: 12,
      warrantyEndsAt: warrantyEndDate(soldOn, 12),
      underWarranty: true,
    });
  });

  it("retrouve l'article par le numéro de la commande", async () => {
    const agent = await admin();
    const sale = await sell({ phone: "0661000000" });
    const hits = (await agent.get("/admin/repairs/warranty").query({ order: String(sale.orderNumber) }).expect(200)).body.data;
    expect(hits.map((hit: { itemId: number }) => hit.itemId)).toEqual([sale.itemId]);
  });

  it("dit hors garantie un article dont la garantie est finie", async () => {
    const agent = await admin();
    await sell({ daysAgo: 400 });
    const hits = (await agent.get("/admin/repairs/warranty").query({ phone: "0550123456" }).expect(200)).body.data;
    expect(hits[0].underWarranty).toBe(false);
  });

  it("propose une livraison livrée ou encaissée, un échange, mais pas ce qui n'a pas été remis", async () => {
    const agent = await admin();
    await sell({ type: "delivery", status: "delivered" });
    await sell({ type: "delivery", status: "collected" });
    await sell({ type: "exchange", status: "picked_up" });
    await sell({ type: "delivery", status: "pending" });
    await sell({ type: "delivery", status: "cancelled" });
    await sell({ type: "delivery", status: "returned" });
    const hits = (await agent.get("/admin/repairs/warranty").query({ phone: "0550123456" }).expect(200)).body.data;
    expect(hits).toHaveLength(3);
  });

  it("ne propose ni un cadeau, ni un article sans garantie, ni la commande d'un autre téléphone", async () => {
    const agent = await admin();
    await sell({ isGift: true });
    await sell({ months: null });
    await sell({ phone: "0770000000" });
    const hits = (await agent.get("/admin/repairs/warranty").query({ phone: "0550123456" }).expect(200)).body.data;
    expect(hits).toEqual([]);
  });

  // Étape 6 : l'appareil de remplacement garde le reste de l'ancienne garantie, écrit sur son article.
  it("lit la date de fin explicite d'un article de remplacement, jusqu'à la fin de ce jour inclus", async () => {
    const agent = await admin();
    const sale = await sell({ type: "exchange", daysAgo: 1, months: 12 });
    await prisma.orderItem.update({ where: { id: sale.itemId }, data: { warrantyUntil: new Date("2030-03-01T00:00:00Z") } });
    const hits = (await agent.get("/admin/repairs/warranty").query({ phone: "0550123456" }).expect(200)).body.data;
    expect(hits[0]).toMatchObject({ itemId: sale.itemId, warrantyEndsAt: "2030-03-01", underWarranty: true });
    // Le dernier jour compte encore, le lendemain non (même règle que `isUnderWarranty`).
    await prisma.orderItem.update({ where: { id: sale.itemId }, data: { warrantyUntil: new Date(`${algiersDate(new Date(Date.now() - 86_400_000))}T00:00:00Z`) } });
    const ended = (await agent.get("/admin/repairs/warranty").query({ phone: "0550123456" }).expect(200)).body.data;
    expect(ended[0].underWarranty).toBe(false);
  });

  it("classe du plus récent au plus ancien", async () => {
    const agent = await admin();
    const old = await sell({ daysAgo: 30 });
    const recent = await sell({ daysAgo: 2 });
    const hits = (await agent.get("/admin/repairs/warranty").query({ phone: "0550123456" }).expect(200)).body.data;
    expect(hits.map((hit: { itemId: number }) => hit.itemId)).toEqual([recent.itemId, old.itemId]);
  });

  it("refuse l'absence de téléphone et de numéro de commande, ou un téléphone invalide", async () => {
    const agent = await admin();
    expect((await agent.get("/admin/repairs/warranty")).status).toBe(400);
    expect((await agent.get("/admin/repairs/warranty").query({ phone: "123" })).status).toBe(400);
    expect((await agent.get("/admin/repairs/warranty").query({ order: "abc" })).status).toBe(400);
  });
});
