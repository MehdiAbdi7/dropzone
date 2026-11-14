import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/config/db.js";
import { createCatalog, loginAs, previewThenOrder, resetDb } from "./helpers.js";

// Rouvrir la caisse du jour (15/11) : l'admin corrige une erreur de fermeture sans perdre la
// vérité des dates. L'argent déjà encaissé reste dans le jour ; le comptage est effacé ; une
// trace garde l'ancien comptage (sinon on pourrait cacher un écart en rouvrant puis refermant).
const at = (algiers: string) => new Date(`${algiers}+01:00`);

beforeEach(async () => {
  await resetDb();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at("2026-11-14T22:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /admin/cash/reopen", () => {
  it("rouvre une caisse fermée : comptage effacé, argent gardé, ancien comptage tracé", async () => {
    const { agent, user } = await loginAs("admin");
    await agent.post("/admin/cash/open").send({ openingFloat: 10_000 }).expect(201);
    await agent.post("/admin/cash/close").send({ countedCash: 9_000 }).expect(200);

    const response = await agent.post("/admin/cash/reopen");
    expect(response.status).toBe(200);
    expect(response.body.data.day).toMatchObject({ openingFloat: 10_000, countedCash: null, closedAt: null });
    expect(response.body.data.summary).toMatchObject({ expectedCash: 10_000, countedCash: null, gap: null });
    expect(response.body.data.reopenings).toHaveLength(1);
    expect(response.body.data.reopenings[0]).toMatchObject({ previousCountedCash: 9_000, userId: user.id });

    const [row] = await prisma.cashReopening.findMany();
    expect(row).toMatchObject({ previousCountedCash: 9_000, userId: user.id });
  });

  it("se referme avec un nouveau comptage, et peut se rouvrir plusieurs fois", async () => {
    const { agent } = await loginAs("admin");
    await agent.post("/admin/cash/open").send({ openingFloat: 10_000 }).expect(201);
    await agent.post("/admin/cash/close").send({ countedCash: 9_000 }).expect(200);
    await agent.post("/admin/cash/reopen").expect(200);
    const closed = await agent.post("/admin/cash/close").send({ countedCash: 10_000 });
    expect(closed.status).toBe(200);
    expect(closed.body.data.summary).toMatchObject({ gap: 0 });
    await agent.post("/admin/cash/reopen").expect(200);
    expect(await prisma.cashReopening.count()).toBe(2);
    const today = await agent.get("/admin/cash/today");
    expect(today.body.data.reopenings.map((r: { previousCountedCash: number }) => r.previousCountedCash)).toEqual([9_000, 10_000]);
  });

  it("refuse si la caisse n'existe pas ou est déjà ouverte", async () => {
    const { agent } = await loginAs("admin");
    expect((await agent.post("/admin/cash/reopen")).status).toBe(409);
    await agent.post("/admin/cash/open").send({ openingFloat: 10_000 }).expect(201);
    expect((await agent.post("/admin/cash/reopen")).status).toBe(409);
    expect(await prisma.cashReopening.count()).toBe(0);
  });

  it("ne rouvre que la caisse du jour : celle de la veille reste fermée", async () => {
    const { agent } = await loginAs("admin");
    await agent.post("/admin/cash/open").send({ openingFloat: 10_000 }).expect(201);
    await agent.post("/admin/cash/close").send({ countedCash: 10_000 }).expect(200);
    vi.setSystemTime(at("2026-11-15T09:00"));
    expect((await agent.post("/admin/cash/reopen")).status).toBe(409);
    const yesterday = await prisma.cashDay.findFirstOrThrow();
    expect(yesterday.closedAt).not.toBeNull();
  });

  it("est réservée à l'admin", async () => {
    const { agent } = await loginAs("customer");
    expect((await agent.post("/admin/cash/reopen")).status).toBe(403);
  });
});

// Le blocage qui a motivé la fonction : supprimer une commande déjà encaissée rend l'argent
// dans la caisse du jour, qui doit donc être ouverte.
describe("supprimer une commande encaissée, caisse fermée", () => {
  it("dit comment s'en sortir, puis passe une fois la caisse rouverte", async () => {
    vi.setSystemTime(at("2026-11-14T10:00"));
    await createCatalog();
    const placed = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], {
      fulfillment: "pickup",
      pickupDate: "2026-11-14",
      pickupTime: "15:00",
    });
    const { agent } = await loginAs("admin");
    await agent.post("/admin/cash/open").send({ openingFloat: 10_000 }).expect(201);
    const order = await prisma.order.findUniqueOrThrow({ where: { number: placed.body.data.number } });
    await agent.post(`/admin/orders/${order.id}/pickup`).send({ method: "cash" }).expect(200);
    await agent.post("/admin/cash/close").send({ countedCash: 10_000 }).expect(200);

    const refused = await agent.delete(`/admin/orders/${order.id}`);
    expect(refused.status).toBe(409);
    expect(refused.body.error.message).toMatch(/rouvrez/i);
    expect(await prisma.order.count()).toBe(1);

    await agent.post("/admin/cash/reopen").expect(200);
    const deleted = await agent.delete(`/admin/orders/${order.id}`);
    expect(deleted.status).toBe(200);
    expect(await prisma.order.count()).toBe(0);
  });
});
