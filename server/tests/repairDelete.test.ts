import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { loginAs, resetDb } from "./helpers.js";
import { addLineOk, adminAgent, makePart, makeRepair, movementsOf, setStatusOk, stockOf } from "./repairHelpers.js";

// Supprimer une fiche (18/11, étape 2) : tant qu'elle n'est pas rendue, ses pièces sorties reviennent au stock.
beforeEach(resetDb);

describe("DELETE /admin/repairs/:id", () => {
  it("remet au stock uniquement les lignes sorties, pour leur quantité", async () => {
    const agent = await adminAgent();
    const sorted = await makePart("Batterie iPhone 13", 5);
    const waiting = await makePart("Nappe", 4);
    const repair = await makeRepair(agent);
    await addLineOk(agent, repair.id, sorted.id, 2);
    await setStatusOk(agent, repair.id, "in_repair");
    // La nappe est ajoutée hors garantie pendant la réparation : elle sort aussi (voir repairStatus).
    // Pour avoir une ligne NON sortie, on repart d'une autre fiche qui n'a jamais été En réparation.
    const idle = await makeRepair(agent);
    await addLineOk(agent, idle.id, waiting.id, 3);

    await agent.delete(`/admin/repairs/${repair.id}`).expect(200);
    await agent.delete(`/admin/repairs/${idle.id}`).expect(200);

    expect(await stockOf(sorted.id)).toBe(5);
    expect(await stockOf(waiting.id)).toBe(4);
    expect(await prisma.repair.count()).toBe(0);
  });

  it("garde les mouvements dans le journal de la pièce, avec leur fiche", async () => {
    const agent = await adminAgent();
    const part = await makePart("Batterie iPhone 13", 5);
    const repair = await makeRepair(agent);
    await addLineOk(agent, repair.id, part.id, 2);
    await setStatusOk(agent, repair.id, "in_repair");
    await agent.delete(`/admin/repairs/${repair.id}`).expect(200);

    const movements = await movementsOf(part.id);
    expect(movements.map((movement) => [movement.kind, movement.delta, movement.stockAfter])).toEqual([
      ["repair", -2, 3],
      ["repair_return", 2, 5],
    ]);
    expect(movements.every((movement) => movement.repairId === repair.id && movement.note === "R-1001")).toBe(true);
  });

  it("refuse de supprimer une fiche rendue", async () => {
    const agent = await adminAgent();
    const repair = await makeRepair(agent);
    await prisma.repair.update({ where: { id: repair.id }, data: { status: "returned" } });
    expect((await agent.delete(`/admin/repairs/${repair.id}`)).status).toBe(409);
    expect(await prisma.repair.count()).toBe(1);
  });

  it("404 sur une fiche inconnue", async () => {
    const agent = await adminAgent();
    expect((await agent.delete("/admin/repairs/99999")).status).toBe(404);
  });

  it("les rôles : vendeur et responsable commande 403, un anonyme 401", async () => {
    for (const role of ["seller", "order_manager"] as const) {
      const { agent } = await loginAs(role, `${role}@test.dz`);
      expect((await agent.delete("/admin/repairs/1")).status).toBe(403);
    }
    expect((await request(app).delete("/admin/repairs/1")).status).toBe(401);
  });
});
