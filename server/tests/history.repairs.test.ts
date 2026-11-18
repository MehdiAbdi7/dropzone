import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/config/db.js";
import { loginAs, resetDb } from "./helpers.js";
import { addLineOk, adminAgent, makePart, makeRepair, makeWarrantyRepair, openCash, readyRepair, setStatusOk } from "./repairHelpers.js";

// L'onglet Réparations de l'historique (18/11, étape 3) : l'argent d'une réparation compte le jour du Rendu, son
// bénéfice est le prix payé moins le coût des pièces, et il a son propre canal.
const at = (algiers: string) => new Date(`${algiers}+01:00`);
const DAY = "2026-11-20";

beforeEach(async () => {
  await resetDb();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at(`${DAY}T10:00`));
});

afterEach(() => {
  vi.useRealTimers();
});

const history = async (agent: Awaited<ReturnType<typeof adminAgent>>, query: Record<string, string> = {}, from = DAY, to = DAY) =>
  (await agent.get("/admin/history").query({ from, to, ...query }).expect(200)).body.data;

// Deux réparations rendues le même jour : l'une payée 8 000 (pièce achetée 3 500), l'autre sous garantie (2 pièces,
// 7 000 de coût, rien encaissé).
async function twoReturned(agent: Awaited<ReturnType<typeof adminAgent>>) {
  await openCash(agent);
  const paid = await readyRepair(agent);
  await setStatusOk(agent, paid.repair.id, "returned", "baridimob");
  const part = await makePart("Écran iPhone 13", 5, 3_500, 6_000);
  const free = await makeWarrantyRepair(agent);
  await addLineOk(agent, free.id, part.id, 2);
  await setStatusOk(agent, free.id, "in_repair");
  await setStatusOk(agent, free.id, "ready");
  await setStatusOk(agent, free.id, "returned");
  return { paid: paid.repair, free };
}

describe("le canal repair", () => {
  it("compte l'argent, les fiches rendues et le bénéfice (sous garantie : négatif)", async () => {
    const agent = await adminAgent();
    await twoReturned(agent);
    const data = await history(agent);
    expect(data.channels.repair).toMatchObject({ collected: 8_000, salesCount: 2, profit: 4_500 - 7_000, returnFees: 0 });
    expect(data.totals).toMatchObject({ collected: 8_000, profit: -2_500, salesCount: 0 });
    expect(data.totals.byKind.repair).toBe(8_000);
    expect(data.totals.byMethod.baridimob).toBe(8_000);
  });

  it("l'argent d'une réparation n'est dans aucun autre canal", async () => {
    const agent = await adminAgent();
    await twoReturned(agent);
    const data = await history(agent);
    for (const channel of ["in_store", "delivery", "pickup", "exchange"]) {
      expect(data.channels[channel]).toMatchObject({ collected: 0, salesCount: 0, profit: 0 });
    }
    const store = await history(agent, { type: "in_store" });
    expect(store.totals).toMatchObject({ collected: 0, profit: 0 });
    const delivery = await history(agent, { type: "delivery" });
    expect(delivery.totals.collected).toBe(0);
  });

  it("l'argent d'une réparation est dans le tiroir de la caisse du jour", async () => {
    const agent = await adminAgent();
    await openCash(agent, 10_000);
    const { repair } = await readyRepair(agent);
    await setStatusOk(agent, repair.id, "returned", "cash");
    const data = await history(agent);
    expect(data.days[0]).toMatchObject({ collected: 8_000, cashDay: { openingFloat: 10_000, countedCash: null } });
  });
});

describe("l'onglet Réparations (type=repair)", () => {
  it("ne montre que l'argent et le bénéfice des réparations, et leur liste", async () => {
    const agent = await adminAgent();
    const { paid, free } = await twoReturned(agent);
    const data = await history(agent, { type: "repair" });
    expect(data.totals).toMatchObject({ collected: 8_000, profit: -2_500 });
    expect(data.orders).toEqual([]);
    const rows = data.repairs as { id: number; number: number; underWarranty: boolean; paidAmount: number; partsCost: number; profit: number; payMethod: string | null; returnedOn: string }[];
    expect(rows).toHaveLength(2);
    const byId = new Map(rows.map((row) => [row.id, row]));
    expect(byId.get(paid.id)).toMatchObject({ number: paid.number, paidAmount: 8_000, partsCost: 3_500, profit: 4_500, payMethod: "baridimob", underWarranty: false, returnedOn: DAY });
    expect(byId.get(free.id)).toMatchObject({ paidAmount: 0, partsCost: 7_000, profit: -7_000, payMethod: null, underWarranty: true });
  });

  it("hors de cet onglet, la liste des réparations est vide", async () => {
    const agent = await adminAgent();
    await twoReturned(agent);
    expect((await history(agent)).repairs).toEqual([]);
    expect((await history(agent, { type: "in_store" })).repairs).toEqual([]);
  });

  it("cherche par numéro (R-1001 ou 1001), nom et téléphone", async () => {
    const agent = await adminAgent();
    const { paid, free } = await twoReturned(agent);
    await prisma.repair.update({ where: { id: free.id }, data: { fullName: "Éloïse Merabet", phone: "0661000000" } });
    const numbers = async (q: string) => ((await history(agent, { type: "repair", q })).repairs as { number: number }[]).map((row) => row.number).sort();
    expect(await numbers(`R-${paid.number}`)).toEqual([paid.number]);
    expect(await numbers(String(paid.number))).toEqual([paid.number]);
    expect(await numbers("eloise")).toEqual([free.number]);
    expect(await numbers("0661")).toEqual([free.number]);
    expect(await numbers("zzz")).toEqual([]);
  });

  it("refuse un type inconnu, accepte repair", async () => {
    const agent = await adminAgent();
    expect((await agent.get("/admin/history").query({ from: DAY, to: DAY, type: "bogus" })).status).toBe(400);
    expect((await agent.get("/admin/history").query({ from: DAY, to: DAY, type: "repair" })).status).toBe(200);
  });
});

describe("la date du Rendu", () => {
  it("une réparation rendue hier ne compte pas aujourd'hui, mais compte hier", async () => {
    const agent = await adminAgent();
    vi.setSystemTime(at("2026-11-19T10:00"));
    await openCash(agent);
    const { repair } = await readyRepair(agent);
    await setStatusOk(agent, repair.id, "returned", "cash");
    vi.setSystemTime(at(`${DAY}T10:00`));

    expect((await history(agent)).channels.repair).toMatchObject({ collected: 0, salesCount: 0, profit: 0 });
    expect((await history(agent, {}, "2026-11-19", "2026-11-19")).channels.repair).toMatchObject({ collected: 8_000, salesCount: 1, profit: 4_500 });
  });

  it("une fiche rendue à 00 h 30 à Alger compte ce jour-là", async () => {
    const agent = await adminAgent();
    vi.setSystemTime(at("2026-11-21T00:30"));
    await openCash(agent);
    const { repair } = await readyRepair(agent);
    await setStatusOk(agent, repair.id, "returned", "cash");
    expect((await history(agent, {}, "2026-11-21", "2026-11-21")).channels.repair.salesCount).toBe(1);
    expect((await history(agent, {}, "2026-11-20", "2026-11-20")).channels.repair.salesCount).toBe(0);
  });
});

describe("supprimer une réparation rendue", () => {
  it("la correction compte aujourd'hui, la fiche disparaît des ventes, la trace est visible dans l'onglet et le Total", async () => {
    const agent = await adminAgent();
    await openCash(agent);
    const { repair } = await readyRepair(agent);
    await setStatusOk(agent, repair.id, "returned", "cash");
    await agent.delete(`/admin/repairs/${repair.id}`).expect(200);

    const tab = await history(agent, { type: "repair" });
    expect(tab.channels.repair).toMatchObject({ collected: 0, salesCount: 0, profit: 0 });
    expect(tab.totals.byKind).toMatchObject({ repair: 8_000, correction: -8_000 });
    expect(tab.repairs).toEqual([]);
    expect(tab.changes).toHaveLength(1);
    expect(tab.changes[0]).toMatchObject({ kind: "deleted", repairNumber: 1001, orderId: null });

    expect((await history(agent)).changes).toHaveLength(1);
    expect((await history(agent, { type: "in_store" })).changes).toEqual([]);
  });

  it("une trace de commande n'a pas de numéro de réparation", async () => {
    const agent = await adminAgent();
    await prisma.orderEvent.create({ data: { kind: "deleted", orderNumber: 1234, summary: "Commande supprimée", orderType: "in_store" } });
    const data = await history(agent);
    expect(data.changes[0]).toMatchObject({ orderNumber: 1234, repairNumber: null });
  });
});

describe("les rôles", () => {
  it("le vendeur et le responsable commande reçoivent 403 sur l'historique", async () => {
    for (const role of ["seller", "order_manager"] as const) {
      const { agent } = await loginAs(role, `${role}@test.dz`);
      expect((await agent.get("/admin/history").query({ from: DAY, to: DAY, type: "repair" })).status).toBe(403);
    }
  });
});

describe("un devis refusé", () => {
  it("compte les frais de diagnostic comme argent et bénéfice, sans coût de pièces", async () => {
    const agent = await adminAgent();
    await openCash(agent);
    const part = await makePart("Écran iPhone 13", 5, 8_000, 12_000);
    const repair = await makeRepair(agent, { laborPrice: 3_000 });
    await addLineOk(agent, repair.id, part.id, 1);
    await setStatusOk(agent, repair.id, "quote");
    await setStatusOk(agent, repair.id, "to_return");
    await agent.patch(`/admin/repairs/${repair.id}`).send({ laborPrice: 500 }).expect(200);
    await setStatusOk(agent, repair.id, "returned", "cash");
    expect((await history(agent)).channels.repair).toMatchObject({ collected: 500, salesCount: 1, profit: 500 });
  });
});
