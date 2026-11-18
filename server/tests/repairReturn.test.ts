import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { algiersDate } from "../src/utils/algiersTime.js";
import { loginAs, resetDb } from "./helpers.js";
import { addLineOk, adminAgent, makePart, makeRepair, makeWarrantyRepair, openCash, readyRepair, setStatus, setStatusOk, stockOf } from "./repairHelpers.js";

// Le Rendu d'une réparation (18/11, étape 3) : l'argent entre dans le journal et la caisse du jour, UNE fois.
beforeEach(resetDb);

const movements = () => prisma.moneyMovement.findMany({ orderBy: { id: "asc" } });
const today = () => new Date(`${algiersDate(new Date())}T00:00:00Z`);

describe("hors garantie : le Rendu encaisse", () => {
  it("écrit UN mouvement repair du total, lié à la fiche, dans la caisse du jour", async () => {
    const agent = await adminAgent();
    await openCash(agent);
    const { repair } = await readyRepair(agent);

    const done = (await setStatusOk(agent, repair.id, "returned", "baridimob")) as unknown as Record<string, unknown>;

    const rows = await movements();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "repair", amount: 8_000, method: "baridimob", repairId: repair.id, orderId: null, orderType: null, note: "Réparation R-1001" });
    expect(rows[0].businessDate).toEqual(today());
    expect(done).toMatchObject({ status: "returned", paidAmount: 8_000, payMethod: "baridimob", partsCost: 3_500, returnedOn: algiersDate(new Date()) });
  });

  it("l'argent d'une réparation en espèces entre dans le tiroir", async () => {
    const agent = await adminAgent();
    await openCash(agent, 10_000);
    const { repair } = await readyRepair(agent);
    await setStatusOk(agent, repair.id, "returned", "cash");
    const summary = (await agent.get("/admin/cash/today").expect(200)).body.data.summary;
    expect(summary).toMatchObject({ cashIn: 8_000, expectedCash: 18_000 });
  });

  it("avant le Rendu, la fiche dit ce que le client doit", async () => {
    const agent = await adminAgent();
    const { repair } = await readyRepair(agent);
    const detail = (await agent.get(`/admin/repairs/${repair.id}`).expect(200)).body.data;
    expect(detail).toMatchObject({ amountDue: 8_000, paidAmount: null, payMethod: null, returnedOn: null });
  });

  it("refuse sans moyen de paiement ou avec un moyen inconnu, et la fiche reste Prête", async () => {
    const agent = await adminAgent();
    await openCash(agent);
    const { repair, part } = await readyRepair(agent);
    const missing = await setStatus(agent, repair.id, "returned");
    expect(missing.status).toBe(400);
    expect(missing.body.error.message).toBe("Choisissez le moyen de paiement");
    expect((await setStatus(agent, repair.id, "returned", "bitcoin")).status).toBe(400);
    expect((await agent.get(`/admin/repairs/${repair.id}`).expect(200)).body.data.status).toBe("ready");
    expect(await movements()).toHaveLength(0);
    expect(await stockOf(part.id)).toBe(4);
  });

  it("refuse quand la caisse n'est pas ouverte, et ne change rien", async () => {
    const agent = await adminAgent();
    const { repair } = await readyRepair(agent);
    const response = await setStatus(agent, repair.id, "returned", "cash");
    expect(response.status).toBe(409);
    expect(response.body.error.message).toContain("caisse");
    expect((await agent.get(`/admin/repairs/${repair.id}`).expect(200)).body.data).toMatchObject({ status: "ready", paidAmount: null });
    expect(await movements()).toHaveLength(0);
  });

  it("refuse quand la caisse du jour est fermée", async () => {
    const agent = await adminAgent();
    await openCash(agent);
    await agent.post("/admin/cash/close").send({ countedCash: 10_000 }).expect(200);
    const { repair } = await readyRepair(agent);
    expect((await setStatus(agent, repair.id, "returned", "cash")).status).toBe(409);
    expect(await movements()).toHaveLength(0);
  });

  it("rendre deux fois en même temps : un seul mouvement", async () => {
    const agent = await adminAgent();
    await openCash(agent);
    const { repair } = await readyRepair(agent);
    const results = await Promise.all([setStatus(agent, repair.id, "returned", "cash"), setStatus(agent, repair.id, "returned", "cash")]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect(await movements()).toHaveLength(1);
  });

  it("changer le prix d'achat de la pièce après le Rendu ne change pas le coût figé", async () => {
    const agent = await adminAgent();
    await openCash(agent);
    const { repair, part } = await readyRepair(agent);
    await setStatusOk(agent, repair.id, "returned", "cash");
    await agent.patch(`/admin/parts/${part.id}`).send({ purchasePrice: 9_999 }).expect(200);
    expect((await agent.get(`/admin/repairs/${repair.id}`).expect(200)).body.data).toMatchObject({ partsCost: 3_500, paidAmount: 8_000 });
  });

  it("une main-d'œuvre à 0 sans pièce : rien à payer, aucun mouvement, la caisse n'est pas exigée", async () => {
    const agent = await adminAgent();
    const repair = await makeRepair(agent, { laborPrice: 0 });
    await setStatusOk(agent, repair.id, "in_repair");
    await setStatusOk(agent, repair.id, "ready");
    const done = (await setStatusOk(agent, repair.id, "returned")) as unknown as Record<string, unknown>;
    expect(done).toMatchObject({ paidAmount: 0, partsCost: 0, payMethod: null });
    expect(await movements()).toHaveLength(0);
  });

  it("un moyen envoyé pour un autre passage est ignoré", async () => {
    const agent = await adminAgent();
    const repair = await makeRepair(agent);
    const response = await setStatus(agent, repair.id, "quote", "cash");
    expect(response.status).toBe(200);
    expect(await movements()).toHaveLength(0);
  });
});

describe("sous garantie et devis refusé", () => {
  it("sous garantie : aucun mouvement, aucune caisse exigée, le coût des pièces est figé", async () => {
    const agent = await adminAgent();
    const part = await makePart("Batterie iPhone 13", 5, 3_500, 6_000);
    const repair = await makeWarrantyRepair(agent);
    await addLineOk(agent, repair.id, part.id, 2);
    await setStatusOk(agent, repair.id, "in_repair");
    await setStatusOk(agent, repair.id, "ready");
    const detail = (await agent.get(`/admin/repairs/${repair.id}`).expect(200)).body.data;
    expect(detail.amountDue).toBe(0);

    const done = (await setStatusOk(agent, repair.id, "returned")) as unknown as Record<string, unknown>;

    expect(done).toMatchObject({ status: "returned", paidAmount: 0, partsCost: 7_000, payMethod: null });
    expect(await movements()).toHaveLength(0);
  });

  it("devis refusé : seuls les frais de diagnostic saisis sont encaissés", async () => {
    const agent = await adminAgent();
    await openCash(agent);
    const part = await makePart("Écran iPhone 13", 5, 8_000, 12_000);
    const repair = await makeRepair(agent, { laborPrice: 3_000 });
    await addLineOk(agent, repair.id, part.id, 1);
    await setStatusOk(agent, repair.id, "quote");
    await setStatusOk(agent, repair.id, "to_return");
    await agent.patch(`/admin/repairs/${repair.id}`).send({ laborPrice: 500 }).expect(200);

    const done = (await setStatusOk(agent, repair.id, "returned", "cash")) as unknown as Record<string, unknown>;

    expect(done).toMatchObject({ paidAmount: 500, partsCost: 0 });
    const rows = await movements();
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(500);
  });

  it("devis refusé sans frais de diagnostic : rien à payer", async () => {
    const agent = await adminAgent();
    const repair = await makeRepair(agent);
    await setStatusOk(agent, repair.id, "quote");
    await setStatusOk(agent, repair.id, "to_return");
    const done = (await setStatusOk(agent, repair.id, "returned")) as unknown as Record<string, unknown>;
    expect(done).toMatchObject({ paidAmount: 0, partsCost: 0 });
    expect(await movements()).toHaveLength(0);
  });
});

describe("les rôles", () => {
  it("vendeur et responsable commande reçoivent 403 sur le Rendu, un anonyme 401", async () => {
    for (const role of ["seller", "order_manager"] as const) {
      const { agent } = await loginAs(role, `${role}@test.dz`);
      expect((await agent.post("/admin/repairs/1/status").send({ status: "returned", method: "cash" })).status).toBe(403);
    }
    expect((await request(app).post("/admin/repairs/1/status").send({ status: "returned", method: "cash" })).status).toBe(401);
  });
});
