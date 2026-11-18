import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { loginAs, resetDb } from "./helpers.js";
import { addLine, addLineOk, adminAgent, makePart, makeRepair, makeWarrantyRepair, movementsOf, setStatusOk, stockOf } from "./repairHelpers.js";

// Les pièces d'une fiche de réparation (18/11, étape 2) : les prix sont copiés, le stock ne bouge qu'à « En réparation ».
beforeEach(resetDb);

describe("POST /admin/repairs/:id/parts", () => {
  it("ajoute une ligne et copie le nom et les prix de la pièce", async () => {
    const agent = await adminAgent();
    const part = await makePart("Batterie iPhone 13", 5, 3_500, 6_000);
    const repair = await makeRepair(agent);
    const detail = await addLineOk(agent, repair.id, part.id, 2);
    expect(detail.parts).toHaveLength(1);
    expect(detail.parts[0]).toMatchObject({ partId: part.id, name: "Batterie iPhone 13", quantity: 2, unitCost: 3_500, unitPrice: 6_000, consumed: false });
  });

  it("changer le prix de la pièce ensuite ne change pas la ligne", async () => {
    const agent = await adminAgent();
    const part = await makePart();
    const repair = await makeRepair(agent);
    await addLineOk(agent, repair.id, part.id);
    await agent.patch(`/admin/parts/${part.id}`).send({ salePrice: 9_999, purchasePrice: 8_888, name: "Autre nom" }).expect(200);
    const detail = (await agent.get(`/admin/repairs/${repair.id}`).expect(200)).body.data;
    expect(detail.parts[0]).toMatchObject({ name: "Batterie iPhone 13", unitCost: 3_500, unitPrice: 6_000 });
  });

  it("ajouter deux fois la même pièce additionne la quantité", async () => {
    const agent = await adminAgent();
    const part = await makePart();
    const repair = await makeRepair(agent);
    await addLineOk(agent, repair.id, part.id, 1);
    const detail = await addLineOk(agent, repair.id, part.id, 2);
    expect(detail.parts).toHaveLength(1);
    expect(detail.parts[0].quantity).toBe(3);
  });

  it("ne touche pas au stock avant « En réparation »", async () => {
    const agent = await adminAgent();
    const part = await makePart();
    const repair = await makeRepair(agent);
    await addLineOk(agent, repair.id, part.id, 2);
    expect(await stockOf(part.id)).toBe(5);
    expect(await movementsOf(part.id)).toHaveLength(0);
  });

  it("refuse une pièce épuisée en la nommant", async () => {
    const agent = await adminAgent();
    const part = await makePart("Écran iPhone 13", 0);
    const repair = await makeRepair(agent);
    const response = await addLine(agent, repair.id, part.id);
    expect(response.status).toBe(409);
    expect(response.body.error.message).toContain("Écran iPhone 13");
  });

  it("refuse une quantité supérieure au stock, y compris en additionnant", async () => {
    const agent = await adminAgent();
    const part = await makePart("Batterie iPhone 13", 3);
    const repair = await makeRepair(agent);
    const tooMany = await addLine(agent, repair.id, part.id, 4);
    expect(tooMany.status).toBe(409);
    expect(tooMany.body.error.message).toContain("Batterie iPhone 13");
    await addLineOk(agent, repair.id, part.id, 2);
    expect((await addLine(agent, repair.id, part.id, 2)).status).toBe(409);
  });

  it("refuse une quantité de 0 ou de 101, une pièce inconnue, un texte", async () => {
    const agent = await adminAgent();
    const part = await makePart("Batterie iPhone 13", 500);
    const repair = await makeRepair(agent);
    expect((await addLine(agent, repair.id, part.id, 0)).status).toBe(400);
    expect((await addLine(agent, repair.id, part.id, 101)).status).toBe(400);
    expect((await agent.post(`/admin/repairs/${repair.id}/parts`).send({ partId: part.id, quantity: "deux" })).status).toBe(400);
    expect((await addLine(agent, repair.id, 99_999)).status).toBe(404);
    expect((await addLine(agent, 99_999, part.id)).status).toBe(404);
  });

  it("refuse de dépasser 100 en additionnant", async () => {
    const agent = await adminAgent();
    const part = await makePart("Batterie iPhone 13", 500);
    const repair = await makeRepair(agent);
    await addLineOk(agent, repair.id, part.id, 60);
    expect((await addLine(agent, repair.id, part.id, 41)).status).toBe(400);
  });
});

describe("PATCH et DELETE /admin/repairs/:id/parts/:lineId", () => {
  it("change la quantité et retire une ligne non sortie, sans toucher au stock", async () => {
    const agent = await adminAgent();
    const part = await makePart();
    const repair = await makeRepair(agent);
    const line = (await addLineOk(agent, repair.id, part.id, 1)).parts[0];
    const changed = (await agent.patch(`/admin/repairs/${repair.id}/parts/${line.id}`).send({ quantity: 3 }).expect(200)).body.data;
    expect(changed.parts[0].quantity).toBe(3);
    const removed = (await agent.delete(`/admin/repairs/${repair.id}/parts/${line.id}`).expect(200)).body.data;
    expect(removed.parts).toEqual([]);
    expect(await stockOf(part.id)).toBe(5);
    expect(await movementsOf(part.id)).toHaveLength(0);
  });

  it("refuse une quantité supérieure au stock et une ligne d'une autre fiche", async () => {
    const agent = await adminAgent();
    const part = await makePart("Batterie iPhone 13", 2);
    const repair = await makeRepair(agent);
    const other = await makeRepair(agent);
    const line = (await addLineOk(agent, repair.id, part.id, 1)).parts[0];
    expect((await agent.patch(`/admin/repairs/${repair.id}/parts/${line.id}`).send({ quantity: 3 })).status).toBe(409);
    expect((await agent.patch(`/admin/repairs/${repair.id}/parts/${line.id}`).send({ quantity: 0 })).status).toBe(400);
    expect((await agent.patch(`/admin/repairs/${other.id}/parts/${line.id}`).send({ quantity: 1 })).status).toBe(404);
    expect((await agent.delete(`/admin/repairs/${other.id}/parts/${line.id}`)).status).toBe(404);
  });

  it("une ligne déjà sortie ajuste le stock par la différence et le dit dans le journal", async () => {
    const agent = await adminAgent();
    const part = await makePart("Batterie iPhone 13", 5);
    const repair = await makeWarrantyRepair(agent);
    await addLineOk(agent, repair.id, part.id, 2);
    await setStatusOk(agent, repair.id, "in_repair");
    expect(await stockOf(part.id)).toBe(3);
    const line = (await agent.get(`/admin/repairs/${repair.id}`).expect(200)).body.data.parts[0];

    await agent.patch(`/admin/repairs/${repair.id}/parts/${line.id}`).send({ quantity: 1 }).expect(200);
    expect(await stockOf(part.id)).toBe(4);
    await agent.delete(`/admin/repairs/${repair.id}/parts/${line.id}`).expect(200);
    expect(await stockOf(part.id)).toBe(5);

    const kinds = (await movementsOf(part.id)).map((movement) => [movement.kind, movement.delta, movement.stockAfter]);
    expect(kinds).toEqual([
      ["repair", -2, 3],
      ["repair_return", 1, 4],
      ["repair_return", 1, 5],
    ]);
  });

  it("une fiche Prête ou Rendue refuse d'ajouter, de changer et de retirer", async () => {
    const agent = await adminAgent();
    const part = await makePart();
    for (const status of ["ready", "to_return", "returned"] as const) {
      const repair = await makeRepair(agent);
      const line = (await addLineOk(agent, repair.id, part.id)).parts[0];
      await prisma.repair.update({ where: { id: repair.id }, data: { status, ...(status === "returned" ? { returnedOn: new Date("2026-11-18T00:00:00Z") } : {}) } });
      expect((await addLine(agent, repair.id, part.id)).status, status).toBe(409);
      expect((await agent.patch(`/admin/repairs/${repair.id}/parts/${line.id}`).send({ quantity: 2 })).status, status).toBe(409);
      expect((await agent.delete(`/admin/repairs/${repair.id}/parts/${line.id}`)).status, status).toBe(409);
    }
  });
});

describe("les rôles", () => {
  it("un anonyme reçoit 401 sur chaque route des pièces d'une fiche (les droits par rôle sont dans repairRoles.test.ts)", async () => {
    const calls: [string, string][] = [
      ["post", "/admin/repairs/1/parts"],
      ["patch", "/admin/repairs/1/parts/1"],
      ["delete", "/admin/repairs/1/parts/1"],
    ];
    for (const [method, url] of calls) {
      expect((await (request(app) as never as Record<string, (u: string) => Promise<{ status: number }>>)[method](url)).status, `anonyme ${method} ${url}`).toBe(401);
    }
  });
});
