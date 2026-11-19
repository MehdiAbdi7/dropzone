import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import type { MovementKind, OrderStatus, OrderType } from "../src/generated/prisma/client.js";
import { createCatalog, loginAs, resetDb } from "./helpers.js";

// L'aperçu du tableau de bord (20/11) : ce que les graphiques montrent. Les ventes suivent la règle de l'accueil
// (une réservation non payée, une livraison non encaissée, un colis retourné et une annulation n'en sont pas),
// à la date où l'argent est arrivé. « Encaissé » est l'argent réel du journal, corrections et frais compris.
const at = (algiers: string) => new Date(`${algiers}+01:00`);
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const MOVEMENT_OF: Record<OrderType, MovementKind> = { in_store: "sale", pickup: "pickup", delivery: "delivery", exchange: "exchange" };

beforeEach(async () => {
  await resetDb();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at("2026-11-20T12:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

let counter = 0;
// Une commande insérée directement, avec son argent : le service ne lit que la base.
async function makeSale(opts: {
  date: string; // le jour du paiement (et de la commande, sauf `orderDate`)
  orderDate?: string;
  type: OrderType;
  status?: OrderStatus;
  price: number;
  cost: number | null;
  name?: string;
  gift?: boolean;
  productId?: number;
  paid?: number | null; // le mouvement d'argent ; null = aucun
}) {
  counter += 1;
  const status = opts.status ?? (opts.type === "delivery" ? "collected" : "picked_up");
  const orderDay = opts.orderDate ?? opts.date;
  const order = await prisma.order.create({
    data: {
      fullName: `Client ${counter}`,
      phone: "0555123456",
      type: opts.type,
      status,
      dailyNumber: counter,
      businessDate: day(orderDay),
      createdAt: at(`${orderDay}T10:00`),
      ...(opts.type === "delivery" ? { wilaya: "Alger", commune: "Kouba", address: "Rue 1" } : {}),
      ...(opts.type === "pickup" ? { pickupDate: day(opts.date), pickupTime: "15:00", reservedUntil: at(`${opts.date}T20:00`) } : {}),
      subtotal: opts.price,
      shippingFee: 0,
      total: opts.price,
      items: {
        create: [
          {
            sku: `SKU-${counter}`,
            name: opts.name ?? `Article ${counter}`,
            options: { Stockage: "256 Go" },
            unitPrice: opts.price,
            unitCost: opts.cost,
            quantity: 1,
            productId: opts.productId,
          },
          ...(opts.gift ? [{ sku: `GIFT-${counter}`, name: "Chargeur offert", unitPrice: 0, unitCost: 1_000, quantity: 1, isGift: true }] : []),
        ],
      },
    },
  });
  if (opts.paid !== null) {
    await prisma.moneyMovement.create({
      data: {
        businessDate: day(opts.date),
        amount: opts.paid ?? opts.price,
        method: "cash",
        kind: MOVEMENT_OF[opts.type],
        orderId: order.id,
        orderType: opts.type,
      },
    });
  }
  return order;
}

// Le jeu d'essai : trois jours de ventes, des commandes qui ne comptent pas, de l'argent qui entre ou sort sans
// vente (correction, frais de retour), et une vieille vente visible seulement sur 30 jours.
async function fixture() {
  const { phone } = await createCatalog();
  await prisma.productImage.create({ data: { productId: phone.id, url: "https://img.test/iphone.webp", position: 0 } });

  const first = await makeSale({ date: "2026-11-20", type: "in_store", price: 100_000, cost: 80_000, name: "Vente magasin", gift: true });
  await makeSale({ date: "2026-11-18", orderDate: "2026-11-17", type: "delivery", price: 50_000, cost: 30_000, name: "Livraison encaissée" });
  await makeSale({ date: "2026-11-19", type: "pickup", price: 30_000, cost: null, name: "Retrait coût inconnu" });
  // Un échange : la commande vaut 200 000, mais seule la différence (50 000) entre dans l'argent.
  await makeSale({ date: "2026-11-20", type: "exchange", price: 200_000, cost: 150_000, paid: 50_000, name: "Échange iPhone", productId: phone.id });
  // Ce qui n'est PAS une vente :
  await makeSale({ date: "2026-11-20", type: "pickup", status: "reserved", price: 70_000, cost: 50_000, paid: null, name: "Réservation" });
  await makeSale({ date: "2026-11-20", type: "in_store", status: "cancelled", price: 60_000, cost: 40_000, paid: null, name: "Annulée" });
  await makeSale({ date: "2026-11-20", type: "delivery", status: "pending", price: 90_000, cost: 70_000, paid: null, name: "Livraison à confirmer" });
  const returned = await makeSale({ date: "2026-11-20", type: "delivery", status: "returned", price: 80_000, cost: 60_000, paid: null, name: "Colis retourné" });
  // De l'argent sans vente : une correction (un remboursement) et les frais d'un colis retourné.
  await prisma.moneyMovement.create({ data: { businessDate: day("2026-11-20"), amount: -10_000, method: "cash", kind: "correction", orderId: first.id, orderType: "in_store" } });
  await prisma.moneyMovement.create({ data: { businessDate: day("2026-11-20"), amount: -2_000, method: "cash", kind: "return_fee", orderId: returned.id, orderType: "delivery" } });
  // Une vieille vente, hors des 7 jours.
  await makeSale({ date: "2026-11-10", type: "in_store", price: 40_000, cost: 25_000, name: "Vieille vente" });
}

const overview = async (agent: Awaited<ReturnType<typeof loginAs>>["agent"], days?: number) =>
  agent.get("/admin/stats/overview").query(days === undefined ? {} : { days });

describe("GET /admin/stats/overview, la série par jour", () => {
  it("donne un point par jour, du plus ancien à aujourd'hui, les jours vides à zéro (7 jours par défaut)", async () => {
    await fixture();
    const { agent } = await loginAs("admin");
    const response = await overview(agent);
    expect(response.status).toBe(200);
    const { series } = response.body.data;
    expect(series).toHaveLength(7);
    expect(series.map((point: { date: string }) => point.date)).toEqual([
      "2026-11-14",
      "2026-11-15",
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
    ]);
    expect(series[0]).toEqual({ date: "2026-11-14", sales: 0, orders: 0, profit: 0, collected: 0 });
  });

  it("compte les ventes à la date de l'argent, pas à celle de la commande", async () => {
    await fixture();
    const { agent } = await loginAs("admin");
    const { series } = (await overview(agent)).body.data;
    const byDate = Object.fromEntries(series.map((point: { date: string }) => [point.date, point]));
    // La livraison est commandée le 17 mais encaissée le 18 : elle compte le 18.
    expect(byDate["2026-11-17"]).toMatchObject({ sales: 0, orders: 0 });
    expect(byDate["2026-11-18"]).toMatchObject({ sales: 50_000, orders: 1, profit: 20_000, collected: 50_000 });
    // Le retrait payé le 19, dont le prix d'achat est inconnu : une vente, mais rien dans le bénéfice.
    expect(byDate["2026-11-19"]).toMatchObject({ sales: 30_000, orders: 1, profit: 0, collected: 30_000 });
  });

  it("n'y met ni réservation, ni livraison non encaissée, ni colis retourné, ni annulation", async () => {
    await fixture();
    const { agent } = await loginAs("admin");
    const { series } = (await overview(agent)).body.data;
    const today = series[6];
    // Magasin 100 000 + échange 200 000 : les quatre autres commandes du 20 ne comptent pas.
    expect(today).toMatchObject({ date: "2026-11-20", sales: 300_000, orders: 2 });
  });

  it("calcule le bénéfice avec les cadeaux, et l'encaissé net des corrections et des frais de retour", async () => {
    await fixture();
    const { agent } = await loginAs("admin");
    const { series } = (await overview(agent)).body.data;
    // (100 000 − 80 000) − 1 000 de cadeau offert + (200 000 − 150 000) = 69 000.
    expect(series[6].profit).toBe(69_000);
    // 100 000 + 50 000 (différence de l'échange) − 10 000 (correction) − 2 000 (frais de retour).
    expect(series[6].collected).toBe(138_000);
  });

  it("dit combien de ventes n'ont pas de bénéfice connu", async () => {
    await fixture();
    const { agent } = await loginAs("admin");
    expect((await overview(agent)).body.data.profitUnknown).toBe(1);
  });

  it("sur 30 jours, y met la vieille vente", async () => {
    await fixture();
    const { agent } = await loginAs("admin");
    const { series } = (await overview(agent, 30)).body.data;
    expect(series).toHaveLength(30);
    expect(series[0].date).toBe("2026-10-22");
    expect(series.find((point: { date: string }) => point.date === "2026-11-10")).toMatchObject({ sales: 40_000, orders: 1 });
    const sevenDays = (await overview(agent, 7)).body.data.series;
    expect(sevenDays.find((point: { date: string }) => point.date === "2026-11-10")).toBeUndefined();
  });
});

describe("GET /admin/stats/overview, les canaux", () => {
  it("répartit les ventes de la période par canal, toujours les quatre dans le même ordre", async () => {
    await fixture();
    const { agent } = await loginAs("admin");
    const { channels } = (await overview(agent)).body.data;
    expect(channels).toEqual([
      { type: "in_store", total: 100_000, count: 1 },
      { type: "delivery", total: 50_000, count: 1 },
      { type: "pickup", total: 30_000, count: 1 },
      { type: "exchange", total: 200_000, count: 1 },
    ]);
  });

  it("garde un canal sans vente à zéro, et suit la période", async () => {
    await fixture();
    const { agent } = await loginAs("admin");
    const thirty = (await overview(agent, 30)).body.data.channels;
    expect(thirty[0]).toEqual({ type: "in_store", total: 140_000, count: 2 });
    await prisma.moneyMovement.deleteMany();
    await prisma.order.deleteMany({ where: { type: "exchange" } });
    const after = (await overview(agent)).body.data.channels;
    expect(after.find((channel: { type: string }) => channel.type === "exchange")).toEqual({ type: "exchange", total: 0, count: 0 });
  });
});

describe("GET /admin/stats/overview, les derniers produits vendus", () => {
  it("liste les ventes les plus récentes d'abord, sans les cadeaux ni ce qui n'est pas une vente", async () => {
    await fixture();
    const { agent } = await loginAs("admin");
    const { recent } = (await overview(agent)).body.data;
    expect(recent.map((item: { name: string }) => item.name)).toEqual([
      "Échange iPhone",
      "Vente magasin",
      "Retrait coût inconnu",
      "Livraison encaissée",
      "Vieille vente",
    ]);
  });

  it("donne de quoi afficher et ouvrir la commande : numéro, canal, jour, prix, quantité, photo", async () => {
    await fixture();
    const { agent } = await loginAs("admin");
    const { recent } = (await overview(agent)).body.data;
    expect(recent[0]).toMatchObject({
      name: "Échange iPhone",
      type: "exchange",
      soldOn: "2026-11-20",
      unitPrice: 200_000,
      quantity: 1,
      options: { Stockage: "256 Go" },
      image: "https://img.test/iphone.webp",
    });
    expect(typeof recent[0].orderId).toBe("number");
    expect(typeof recent[0].dailyNumber).toBe("number");
    // Une ligne sans produit n'a pas de photo.
    expect(recent[1].image).toBeNull();
  });

  it("n'en montre pas plus de 8", async () => {
    await createCatalog();
    for (let index = 0; index < 10; index += 1) {
      await makeSale({ date: "2026-11-20", type: "in_store", price: 10_000, cost: 5_000, name: `Vente ${index}` });
    }
    const { agent } = await loginAs("admin");
    expect((await overview(agent)).body.data.recent).toHaveLength(8);
  });
});

describe("GET /admin/stats/overview, les règles de la route", () => {
  it("refuse une période autre que 7 ou 30 jours", async () => {
    const { agent } = await loginAs("admin");
    for (const days of [0, 1, 14, 31, 365]) expect((await overview(agent, days)).status, String(days)).toBe(400);
    expect((await agent.get("/admin/stats/overview").query({ days: "abc" })).status).toBe(400);
  });

  it("est réservée à l'admin", async () => {
    for (const role of ["seller", "order_manager", "technician", "customer"] as const) {
      const { agent } = await loginAs(role);
      expect((await overview(agent)).status, role).toBe(403);
    }
    expect((await request(app).get("/admin/stats/overview")).status).toBe(401);
  });
});
