import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { releaseReservationsMiddleware } from "../src/middlewares/releaseReservations.js";
import { releaseExpiredReservations } from "../src/modules/orders/reservations.js";
import { createCatalog, previewThenOrder, resetDb } from "./helpers.js";

// Un retrait non récupéré (14/11) : la réservation tient jusqu'à minuit le jour choisi, puis la
// commande passe « expirée » et l'appareil revient en stock tout seul.
const at = (algiers: string) => new Date(`${algiers}+01:00`);
const stockOf = async (sku: string) => (await prisma.productVariant.findUniqueOrThrow({ where: { sku } })).stock;

async function reserveToday(sku = "IP-NEW-256") {
  vi.setSystemTime(at("2026-11-14T10:00"));
  const response = await previewThenOrder([{ sku, quantity: 1 }], {
    fulfillment: "pickup",
    pickupDate: "2026-11-14",
    pickupTime: "15:00",
  });
  expect(response.status).toBe(201);
  return prisma.order.findUniqueOrThrow({ where: { number: response.body.data.number } });
}

beforeEach(async () => {
  await resetDb();
  await createCatalog();
  vi.useFakeTimers({ toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("releaseExpiredReservations", () => {
  it("à minuit passé, la commande expire et l'appareil revient en stock", async () => {
    const before = await stockOf("IP-NEW-256");
    const order = await reserveToday();
    expect(await stockOf("IP-NEW-256")).toBe(before - 1);

    expect(await releaseExpiredReservations(at("2026-11-15T00:01"))).toBe(1);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("expired");
    expect(await stockOf("IP-NEW-256")).toBe(before);
  });

  it("ne touche pas une réservation encore valable", async () => {
    const order = await reserveToday();
    expect(await releaseExpiredReservations(at("2026-11-14T23:59"))).toBe(0);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("reserved");
  });

  it("ne rend le stock qu'une fois, même appelée deux fois en même temps", async () => {
    const before = await stockOf("IP-NEW-256");
    await reserveToday();
    const counts = await Promise.all([
      releaseExpiredReservations(at("2026-11-15T00:01")),
      releaseExpiredReservations(at("2026-11-15T00:01")),
    ]);
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(1);
    expect(await stockOf("IP-NEW-256")).toBe(before);
  });

  it("remet à jour le prix « dès » du produit d'une affaire libérée", async () => {
    await reserveToday("IP-R-DEAL");
    await releaseExpiredReservations(at("2026-11-15T00:01"));
    const deal = await prisma.productVariant.findUniqueOrThrow({ where: { sku: "IP-R-DEAL" }, include: { product: true } });
    expect(deal.stock).toBe(1);
    expect(deal.product.minPrice).toBeLessThanOrEqual(deal.price);
  });
});

describe("dans l'API", () => {
  it("un client qui consulte la boutique après minuit libère le retrait expiré", async () => {
    const before = await stockOf("IP-NEW-256");
    const order = await reserveToday();
    vi.setSystemTime(at("2026-11-15T08:00"));
    await request(app).get("/products").expect(200);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("expired");
    expect(await stockOf("IP-NEW-256")).toBe(before);
  });
});

describe("releaseReservationsMiddleware", () => {
  it("ne libère qu'une fois par intervalle, et laisse toujours passer la requête", async () => {
    const release = vi.fn().mockResolvedValue(0);
    const mini = express();
    mini.use(releaseReservationsMiddleware({ minIntervalMs: 60_000, release }));
    mini.get("/", (_req, res) => {
      res.json({ ok: true });
    });
    vi.setSystemTime(at("2026-11-15T00:01"));
    await request(mini).get("/").expect(200);
    await request(mini).get("/").expect(200);
    expect(release).toHaveBeenCalledTimes(1);
    vi.setSystemTime(at("2026-11-15T00:02:01"));
    await request(mini).get("/").expect(200);
    expect(release).toHaveBeenCalledTimes(2);
  });

  it("une erreur de libération ne bloque pas la requête", async () => {
    const release = vi.fn().mockRejectedValue(new Error("base injoignable"));
    const mini = express();
    mini.use(releaseReservationsMiddleware({ minIntervalMs: 60_000, release }));
    mini.get("/", (_req, res) => {
      res.json({ ok: true });
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    await request(mini).get("/").expect(200);
  });
});
