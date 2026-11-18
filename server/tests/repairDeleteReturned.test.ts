import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { algiersDate } from "../src/utils/algiersTime.js";
import { resetDb } from "./helpers.js";
import { addLineOk, adminAgent, makePart, makeRepair, makeWarrantyRepair, movementsOf, openCash, readyRepair, setStatusOk, stockOf } from "./repairHelpers.js";

// Supprimer une réparation RENDUE (18/11, étape 3) : l'admin seul, comme une commande. L'argent est rendu par un
// mouvement du jour, les pièces sorties reviennent au stock, une trace garde de quoi retrouver la fiche.
beforeEach(resetDb);

const moneyRows = () => prisma.moneyMovement.findMany({ orderBy: { id: "asc" } });

describe("DELETE /admin/repairs/:id sur une fiche rendue", () => {
  it("rend l'argent par un mouvement négatif du jour, par moyen de paiement", async () => {
    const agent = await adminAgent();
    await openCash(agent, 10_000);
    const { repair } = await readyRepair(agent);
    await setStatusOk(agent, repair.id, "returned", "cash");

    await agent.delete(`/admin/repairs/${repair.id}`).expect(200);

    const rows = await moneyRows();
    expect(rows.map((row) => [row.kind, row.amount, row.method])).toEqual([
      ["repair", 8_000, "cash"],
      ["correction", -8_000, "cash"],
    ]);
    expect(rows[1]).toMatchObject({ repairId: repair.id, orderType: null, note: "Suppression de la réparation R-1001" });
    expect(rows[1].businessDate).toEqual(new Date(`${algiersDate(new Date())}T00:00:00Z`));
    const summary = (await agent.get("/admin/cash/today").expect(200)).body.data.summary;
    expect(summary.cashIn).toBe(0);
  });

  it("remet les pièces sorties au stock, une seule fois, et garde le journal", async () => {
    const agent = await adminAgent();
    await openCash(agent);
    const { repair, part } = await readyRepair(agent);
    await setStatusOk(agent, repair.id, "returned", "cash");
    expect(await stockOf(part.id)).toBe(4);

    await agent.delete(`/admin/repairs/${repair.id}`).expect(200);

    expect(await stockOf(part.id)).toBe(5);
    expect((await movementsOf(part.id)).map((movement) => movement.kind)).toEqual(["repair", "repair_return"]);
    expect((await agent.delete(`/admin/repairs/${repair.id}`)).status).toBe(404);
    expect(await stockOf(part.id)).toBe(5);
  });

  it("écrit une trace avec le numéro de la réparation et la différence d'argent", async () => {
    const agent = await adminAgent();
    await openCash(agent);
    const { repair } = await readyRepair(agent);
    await setStatusOk(agent, repair.id, "returned", "baridimob");
    await agent.delete(`/admin/repairs/${repair.id}`).expect(200);

    const events = await prisma.orderEvent.findMany();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "deleted", orderId: null, orderType: null, orderNumber: 1001, repairNumber: 1001, amountDelta: -8_000 });
    expect(events[0].summary).toContain("Karim Benali");
    expect(events[0].summary).toContain("iPhone 13");
  });

  it("ne touche pas à une commande qui porte le même numéro", async () => {
    const agent = await adminAgent();
    await openCash(agent);
    const order = await prisma.order.create({
      data: { fullName: "Autre", phone: "0661000000", type: "in_store", status: "picked_up", dailyNumber: 1, businessDate: new Date("2026-11-18"), subtotal: 5_000, shippingFee: 0, total: 5_000 },
      select: { id: true, number: true },
    });
    await prisma.moneyMovement.create({
      data: { businessDate: new Date(`${algiersDate(new Date())}T00:00:00Z`), amount: 5_000, method: "cash", kind: "sale", orderType: "in_store", orderId: order.id },
    });
    const { repair } = await readyRepair(agent);
    expect(order.number).toBe(repair.number);
    await setStatusOk(agent, repair.id, "returned", "cash");

    await agent.delete(`/admin/repairs/${repair.id}`).expect(200);

    expect(await prisma.order.count()).toBe(1);
    expect((await prisma.moneyMovement.findMany({ where: { orderId: order.id } })).map((row) => row.amount)).toEqual([5_000]);
  });

  it("refuse quand la caisse du jour n'est pas ouverte et qu'il y a de l'argent à rendre, sans rien changer", async () => {
    const agent = await adminAgent();
    await openCash(agent);
    const { repair, part } = await readyRepair(agent);
    await setStatusOk(agent, repair.id, "returned", "cash");
    await agent.post("/admin/cash/close").send({ countedCash: 18_000 }).expect(200);

    const response = await agent.delete(`/admin/repairs/${repair.id}`);

    expect(response.status).toBe(409);
    expect(await prisma.repair.count()).toBe(1);
    expect(await stockOf(part.id)).toBe(4);
    expect(await moneyRows()).toHaveLength(1);
    expect(await prisma.orderEvent.count()).toBe(0);
  });

  it("sous garantie : rien à rendre, pas de caisse exigée, pièces remises, trace à 0 DA", async () => {
    const agent = await adminAgent();
    const part = await makePart("Batterie iPhone 13", 5, 3_500, 6_000);
    const repair = await makeWarrantyRepair(agent);
    await addLineOk(agent, repair.id, part.id, 2);
    await setStatusOk(agent, repair.id, "in_repair");
    await setStatusOk(agent, repair.id, "ready");
    await setStatusOk(agent, repair.id, "returned");
    expect(await stockOf(part.id)).toBe(3);

    await agent.delete(`/admin/repairs/${repair.id}`).expect(200);

    expect(await stockOf(part.id)).toBe(5);
    expect(await moneyRows()).toHaveLength(0);
    expect((await prisma.orderEvent.findMany())[0]).toMatchObject({ repairNumber: 1001, amountDelta: 0 });
  });

  it("un devis refusé rendu : aucune pièce ne remonte (elles n'étaient pas sorties)", async () => {
    const agent = await adminAgent();
    const part = await makePart("Écran iPhone 13", 5, 8_000, 12_000);
    const repair = await makeRepair(agent, { laborPrice: 1_000 });
    await addLineOk(agent, repair.id, part.id, 1);
    await setStatusOk(agent, repair.id, "quote");
    await setStatusOk(agent, repair.id, "to_return");
    await setStatusOk(agent, repair.id, "returned");

    await agent.delete(`/admin/repairs/${repair.id}`).expect(200);

    expect(await stockOf(part.id)).toBe(5);
    expect(await movementsOf(part.id)).toHaveLength(0);
  });
});
