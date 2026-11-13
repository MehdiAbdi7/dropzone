import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loginAs, resetDb } from "./helpers.js";

// La journée de caisse (14/11) : ouverte avec un fond, fermée avec le montant compté.
const at = (algiers: string) => new Date(`${algiers}+01:00`);

beforeEach(async () => {
  await resetDb();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at("2026-11-14T09:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("journée de caisse", () => {
  it("n'existe pas avant l'ouverture", async () => {
    const { agent } = await loginAs("admin");
    const response = await agent.get("/admin/cash/today");
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ date: "2026-11-14", day: null, summary: null, movements: [] });
  });

  it("s'ouvre avec un fond, une seule fois par jour", async () => {
    const { agent } = await loginAs("admin");
    const opened = await agent.post("/admin/cash/open").send({ openingFloat: 10000 });
    expect(opened.status).toBe(201);
    expect((await agent.post("/admin/cash/open").send({ openingFloat: 5000 })).status).toBe(409);
    const today = await agent.get("/admin/cash/today");
    expect(today.body.data.day).toMatchObject({ openingFloat: 10000, countedCash: null, closedAt: null });
    expect(today.body.data.summary).toMatchObject({ expectedCash: 10000 });
  });

  it("se ferme avec le comptage, une seule fois, et seulement si elle est ouverte", async () => {
    const { agent } = await loginAs("admin");
    expect((await agent.post("/admin/cash/close").send({ countedCash: 9000 })).status).toBe(409);
    await agent.post("/admin/cash/open").send({ openingFloat: 10000 });
    const closed = await agent.post("/admin/cash/close").send({ countedCash: 9500 });
    expect(closed.status).toBe(200);
    expect(closed.body.data.summary).toMatchObject({ entered: -500, gap: -500 });
    expect((await agent.post("/admin/cash/close").send({ countedCash: 9500 })).status).toBe(409);
  });

  it("refuse un montant négatif ou à virgule", async () => {
    const { agent } = await loginAs("admin");
    expect((await agent.post("/admin/cash/open").send({ openingFloat: -1 })).status).toBe(400);
    expect((await agent.post("/admin/cash/open").send({ openingFloat: 10.5 })).status).toBe(400);
  });

  it("une nouvelle journée commence après minuit", async () => {
    const { agent } = await loginAs("admin");
    await agent.post("/admin/cash/open").send({ openingFloat: 10000 });
    vi.setSystemTime(at("2026-11-15T09:00"));
    const today = await agent.get("/admin/cash/today");
    expect(today.body.data).toMatchObject({ date: "2026-11-15", day: null });
  });

  it("est réservée à l'admin pour l'instant", async () => {
    const { agent } = await loginAs("customer");
    expect((await agent.get("/admin/cash/today")).status).toBe(403);
  });
});

// Relecture du lot 2 (15/11) : une correction d'argent ne doit pas tomber sur une caisse qui se ferme.
describe("requireOpenCashDay et la fermeture", () => {
  it("la fermeture attend la fin de la transaction qui a vérifié que la caisse est ouverte", async () => {
    const { closeCashDay, openCashDay, requireOpenCashDay } = await import("../src/modules/cash/cash.service.js");
    const { prisma } = await import("../src/config/db.js");
    const now = new Date();
    await openCashDay(1000, 1, now);
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const writer = prisma.$transaction(async (tx) => {
      await requireOpenCashDay(tx, now);
      await gate; // le temps d'écrire le stock, les lignes et la correction
    });
    await sleep(150);
    let closed = false;
    const closing = closeCashDay(1000, 1, now).then(() => {
      closed = true;
    });
    await sleep(400);
    expect(closed).toBe(false);
    release();
    await writer;
    await closing;
    expect(closed).toBe(true);
  });
});
