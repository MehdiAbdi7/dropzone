import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { createCatalog, customer, previewThenOrder, resetDb } from "./helpers.js";

// Le retrait au magasin (14/11) : le client choisit aujourd'hui ou demain et une heure ; le
// téléphone est réservé (stock retiré) jusqu'à minuit le jour choisi ; il paie au magasin.
const stockOf = async (sku: string) => (await prisma.productVariant.findUniqueOrThrow({ where: { sku } })).stock;
const at = (algiers: string) => new Date(`${algiers}+01:00`);

// Un retrait : pas d'adresse, un jour et une heure.
const pickup = (pickupDay: "today" | "tomorrow", pickupTime: string) => ({
  fulfillment: "pickup",
  pickupDay,
  pickupTime,
  wilaya: undefined,
  commune: undefined,
  address: undefined,
});

beforeEach(async () => {
  await resetDb();
  await createCatalog();
  // Le 14/11/2026 à 10h, heure d'Alger (un samedi). Seule la date est figée : les timers
  // restent réels pour la base et supertest.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at("2026-11-14T10:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /orders en retrait au magasin", () => {
  it("réserve l'appareil : stock retiré, sans frais de livraison, réservé jusqu'à minuit le jour choisi", async () => {
    const before = await stockOf("IP-NEW-256");
    const response = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], pickup("tomorrow", "15:30"));
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ type: "pickup", pickupDate: "2026-11-15", pickupTime: "15:30" });
    expect(await stockOf("IP-NEW-256")).toBe(before - 1);

    const order = await prisma.order.findFirstOrThrow();
    expect(order).toMatchObject({ status: "reserved", type: "pickup", shippingFee: 0, wilaya: null, address: null });
    expect(order.total).toBe(order.subtotal);
    expect(order.reservedUntil?.toISOString()).toBe("2026-11-15T23:00:00.000Z");
  });

  it("numérote chaque commande dans sa journée", async () => {
    const first = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], pickup("today", "15:00"));
    const second = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }]);
    expect([first.body.data.dailyNumber, second.body.data.dailyNumber]).toEqual([1, 2]);
  });

  it("refuse un créneau hors des horaires, déjà passé, ou un jour fermé", async () => {
    const tooLate = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], pickup("today", "20:00"));
    expect(tooLate.status).toBe(400);
    expect(tooLate.body.error.message).toBe("Ce créneau n'est pas disponible");

    const past = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], pickup("today", "09:30"));
    expect(past.status).toBe(400);

    // Le 15/11/2026 est un dimanche (0).
    await prisma.storeSettings.update({ where: { id: 1 }, data: { closedDays: [0] } });
    const closed = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], pickup("tomorrow", "15:30"));
    expect(closed.status).toBe(400);
    expect(await prisma.order.count()).toBe(0);
  });

  it("n'exige pas d'adresse pour un retrait, et l'exige toujours pour une livraison", async () => {
    const delivery = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], {
      fulfillment: "delivery",
      address: undefined,
    });
    expect(delivery.status).toBe(400);
    const withoutChoice = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], { fulfillment: undefined });
    expect(withoutChoice.status).toBe(201);
    expect((await prisma.order.findFirstOrThrow()).type).toBe("delivery");
  });
});

describe("POST /orders/preview", () => {
  it("n'ajoute pas de frais de livraison à un retrait", async () => {
    // Un petit panier : en livraison, il paierait les frais.
    const items = [{ sku: "COQ-IP15PM", quantity: 1 }];
    const delivery = await request(app).post("/orders/preview").send({ items });
    const pickupPreview = await request(app).post("/orders/preview").send({ items, fulfillment: "pickup" });
    expect(delivery.body.data.shippingFee).toBeGreaterThan(0);
    expect(pickupPreview.body.data.shippingFee).toBe(0);
    expect(pickupPreview.body.data.total).toBe(pickupPreview.body.data.subtotal);
  });
});

it("le client de test reste une livraison par défaut", () => {
  expect(customer).not.toHaveProperty("fulfillment");
});

describe("POST /orders/track d'un retrait", () => {
  it("renvoie le type, le numéro du jour, le jour et l'heure du retrait", async () => {
    const placed = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], pickup("tomorrow", "15:30"));
    const response = await request(app).post("/orders/track").send({ number: placed.body.data.number, phone: "0555123456" });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      type: "pickup",
      status: "reserved",
      dailyNumber: 1,
      pickupDate: "2026-11-15",
      pickupTime: "15:30",
    });
  });
});
