import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { loginAs, resetDb } from "./helpers.js";
import { addLineOk, adminAgent, makePart, makeRepair, makeWarrantyRepair, movementsOf, setStatus, setStatusOk, stockOf } from "./repairHelpers.js";

// Les étapes d'une fiche (18/11, étape 2) : les pièces sortent du stock à « En réparation », et seulement là.
beforeEach(resetDb);

describe("Reçu → En réparation : la sortie du stock", () => {
  it("sort les pièces du stock, écrit le journal et marque les lignes sorties", async () => {
    const agent = await adminAgent();
    const part = await makePart("Batterie iPhone 13", 5);
    const repair = await makeRepair(agent);
    await addLineOk(agent, repair.id, part.id, 2);

    const detail = await setStatusOk(agent, repair.id, "in_repair");

    expect(detail.status).toBe("in_repair");
    expect(detail.parts[0].consumed).toBe(true);
    expect(await stockOf(part.id)).toBe(3);
    const [movement] = await movementsOf(part.id);
    expect(movement).toMatchObject({ kind: "repair", delta: -2, stockAfter: 3, repairId: repair.id, note: "R-1001" });
    expect(movement.userId).not.toBeNull();
  });

  it("le même passage envoyé deux fois est refusé et ne sort rien de plus", async () => {
    const agent = await adminAgent();
    const part = await makePart("Batterie iPhone 13", 5);
    const repair = await makeRepair(agent);
    await addLineOk(agent, repair.id, part.id, 2);
    await setStatusOk(agent, repair.id, "in_repair");
    expect((await setStatus(agent, repair.id, "in_repair")).status).toBe(409);
    expect(await stockOf(part.id)).toBe(3);
    expect(await movementsOf(part.id)).toHaveLength(1);
  });

  it("deux envois en même temps : un seul sort les pièces", async () => {
    const agent = await adminAgent();
    const part = await makePart("Batterie iPhone 13", 5);
    const repair = await makeRepair(agent);
    await addLineOk(agent, repair.id, part.id, 2);
    const results = await Promise.all([setStatus(agent, repair.id, "in_repair"), setStatus(agent, repair.id, "in_repair")]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect(await stockOf(part.id)).toBe(3);
  });

  it("un stock insuffisant annule tout et nomme la pièce qui manque", async () => {
    const agent = await adminAgent();
    const battery = await makePart("Batterie iPhone 13", 5);
    const screen = await makePart("Écran iPhone 13", 1);
    const repair = await makeRepair(agent);
    await addLineOk(agent, repair.id, battery.id, 1);
    await addLineOk(agent, repair.id, screen.id, 1);
    // Le stock de l'écran tombe avant le passage (autre réparation, correction…).
    await prisma.part.update({ where: { id: screen.id }, data: { stock: 0 } });

    const response = await setStatus(agent, repair.id, "in_repair");

    expect(response.status).toBe(409);
    expect(response.body.error.message).toBe("Stock insuffisant : « Écran iPhone 13 » (il en reste 0, il en faut 1)");
    expect(await stockOf(battery.id)).toBe(5);
    expect(await movementsOf(battery.id)).toHaveLength(0);
    expect((await agent.get(`/admin/repairs/${repair.id}`).expect(200)).body.data.status).toBe("received");
  });

  it("deux fiches se disputent la dernière pièce : une passe, l'autre est refusée, jamais de stock négatif", async () => {
    const agent = await adminAgent();
    const part = await makePart("Batterie iPhone 13", 1);
    const first = await makeRepair(agent);
    const second = await makeRepair(agent);
    await addLineOk(agent, first.id, part.id, 1);
    await addLineOk(agent, second.id, part.id, 1);
    const results = await Promise.all([setStatus(agent, first.id, "in_repair"), setStatus(agent, second.id, "in_repair")]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect(await stockOf(part.id)).toBe(0);
    const loser = results.find((result) => result.status === 409)!;
    expect(loser.body.error.message).toContain("Batterie iPhone 13");
    expect(await movementsOf(part.id)).toHaveLength(1);
  });
});

describe("les devis et la garantie", () => {
  it("hors garantie, sans devis fixé : 400 vers Devis et vers En réparation", async () => {
    const agent = await adminAgent();
    const repair = await makeRepair(agent, { laborPrice: undefined });
    expect(repair.laborPrice).toBeNull();
    expect((await setStatus(agent, repair.id, "quote")).status).toBe(400);
    const response = await setStatus(agent, repair.id, "in_repair");
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Fixez le devis avant de le proposer au client");
  });

  it("une main-d'œuvre à 0 ou une seule pièce suffit comme devis", async () => {
    const agent = await adminAgent();
    const free = await makeRepair(agent, { laborPrice: 0 });
    await setStatusOk(agent, free.id, "quote");
    const part = await makePart();
    const withPart = await makeRepair(agent, { laborPrice: undefined });
    await addLineOk(agent, withPart.id, part.id);
    await setStatusOk(agent, withPart.id, "quote");
  });

  it("sous garantie : pas de devis (400), mais En réparation sans devis fixé", async () => {
    const agent = await adminAgent();
    const repair = await makeWarrantyRepair(agent);
    await prisma.repair.update({ where: { id: repair.id }, data: { laborPrice: null } });
    const refused = await setStatus(agent, repair.id, "quote");
    expect(refused.status).toBe(400);
    expect(refused.body.error.message).toBe("Sous garantie : pas de devis");
    await setStatusOk(agent, repair.id, "in_repair");
  });
});

describe("le circuit", () => {
  it("Devis → À rendre remet au stock les pièces déjà sorties et laisse les autres", async () => {
    const agent = await adminAgent();
    const sorted = await makePart("Batterie iPhone 13", 5);
    const repair = await makeRepair(agent);
    await addLineOk(agent, repair.id, sorted.id, 2);
    await setStatusOk(agent, repair.id, "in_repair");
    expect(await stockOf(sorted.id)).toBe(3);

    // Une pièce de plus découverte en cours de réparation : hors garantie, on revient au devis.
    const detail = await addLineOk(agent, repair.id, (await makePart("Nappe", 4)).id, 1);
    expect(detail.status).toBe("quote");

    const refused = await setStatusOk(agent, repair.id, "to_return");
    expect(refused.status).toBe("to_return");
    expect(refused.parts.every((line) => !line.consumed)).toBe(true);
    expect(await stockOf(sorted.id)).toBe(5);
  });

  it("Devis refusé sans aucune pièce sortie ne crée aucun mouvement", async () => {
    const agent = await adminAgent();
    const part = await makePart();
    const repair = await makeRepair(agent);
    await addLineOk(agent, repair.id, part.id);
    await setStatusOk(agent, repair.id, "quote");
    await setStatusOk(agent, repair.id, "to_return");
    expect(await movementsOf(part.id)).toHaveLength(0);
    expect(await stockOf(part.id)).toBe(5);
  });

  it("En réparation → Prêt → Rendu, et À rendre → Rendu, sans aucun mouvement d'argent quand rien n'est dû", async () => {
    const agent = await adminAgent();
    const repair = await makeRepair(agent, { laborPrice: 0 });
    await setStatusOk(agent, repair.id, "in_repair");
    await setStatusOk(agent, repair.id, "ready");
    const done = await setStatusOk(agent, repair.id, "returned");
    expect(done.nextStatuses).toEqual([]);

    const refused = await makeRepair(agent);
    await setStatusOk(agent, refused.id, "quote");
    await setStatusOk(agent, refused.id, "to_return");
    await setStatusOk(agent, refused.id, "returned");

    expect(await prisma.moneyMovement.count()).toBe(0);
  });

  it("refuse un passage hors circuit et une étape inconnue", async () => {
    const agent = await adminAgent();
    const repair = await makeRepair(agent);
    for (const status of ["ready", "returned", "to_return", "received"]) {
      expect((await setStatus(agent, repair.id, status)).status, status).toBe(409);
    }
    expect((await setStatus(agent, repair.id, "nimporte")).status).toBe(400);
    expect((await setStatus(agent, 99_999, "quote")).status).toBe(404);
    await prisma.repair.update({ where: { id: repair.id }, data: { status: "returned", returnedOn: new Date("2026-11-18T00:00:00Z") } });
    expect((await setStatus(agent, repair.id, "received")).status).toBe(409);
  });

  it("écrit une étape par passage, avec son auteur", async () => {
    const agent = await adminAgent();
    const repair = await makeRepair(agent);
    await setStatusOk(agent, repair.id, "quote");
    const detail = await setStatusOk(agent, repair.id, "in_repair");
    expect(detail.events.map((event) => event.status)).toEqual(["received", "quote", "in_repair"]);
    expect(detail.events.every((event) => event.userId !== null)).toBe(true);
  });
});

describe("une pièce de plus, ou un prix qui change, pendant la réparation", () => {
  it("sous garantie, une ligne ajoutée sort tout de suite et la fiche reste En réparation", async () => {
    const agent = await adminAgent();
    const first = await makePart("Batterie iPhone 13", 5);
    const second = await makePart("Nappe", 4);
    const repair = await makeWarrantyRepair(agent);
    await addLineOk(agent, repair.id, first.id, 1);
    await setStatusOk(agent, repair.id, "in_repair");

    const detail = await addLineOk(agent, repair.id, second.id, 1);

    expect(detail.status).toBe("in_repair");
    expect(await stockOf(second.id)).toBe(3);
    expect(detail.parts.every((line) => line.consumed)).toBe(true);
    expect((await movementsOf(second.id))[0]).toMatchObject({ kind: "repair", delta: -1, repairId: repair.id });
  });

  it("hors garantie, la ligne ajoutée sort aussi et la fiche repasse à Devis, sans rien ressortir au retour", async () => {
    const agent = await adminAgent();
    const first = await makePart("Batterie iPhone 13", 5);
    const second = await makePart("Nappe", 4);
    const repair = await makeRepair(agent);
    await addLineOk(agent, repair.id, first.id, 1);
    await setStatusOk(agent, repair.id, "in_repair");

    const detail = await addLineOk(agent, repair.id, second.id, 1);

    expect(detail.status).toBe("quote");
    expect(await stockOf(second.id)).toBe(3);
    expect(detail.events.map((event) => event.status)).toEqual(["received", "in_repair", "quote"]);

    await setStatusOk(agent, repair.id, "in_repair");
    expect(await stockOf(first.id)).toBe(4);
    expect(await stockOf(second.id)).toBe(3);
    expect(await movementsOf(first.id)).toHaveLength(1);
  });

  it("hors garantie, changer la main-d'œuvre pendant la réparation repasse à Devis ; la même valeur ne change rien", async () => {
    const agent = await adminAgent();
    const repair = await makeRepair(agent, { laborPrice: 1_000 });
    await setStatusOk(agent, repair.id, "in_repair");
    const same = (await agent.patch(`/admin/repairs/${repair.id}`).send({ laborPrice: 1_000 }).expect(200)).body.data;
    expect(same.status).toBe("in_repair");
    const changed = (await agent.patch(`/admin/repairs/${repair.id}`).send({ laborPrice: 2_500 }).expect(200)).body.data;
    expect(changed.status).toBe("quote");
  });

  it("sous garantie, changer la main-d'œuvre ne change pas l'étape", async () => {
    const agent = await adminAgent();
    const repair = await makeWarrantyRepair(agent);
    await setStatusOk(agent, repair.id, "in_repair");
    const changed = (await agent.patch(`/admin/repairs/${repair.id}`).send({ laborPrice: 2_500 }).expect(200)).body.data;
    expect(changed.status).toBe("in_repair");
  });

  it("hors garantie, retirer une ligne déjà sortie remet la pièce au stock et repasse à Devis", async () => {
    const agent = await adminAgent();
    const part = await makePart("Batterie iPhone 13", 5);
    const repair = await makeRepair(agent);
    const line = (await addLineOk(agent, repair.id, part.id, 2)).parts[0];
    await setStatusOk(agent, repair.id, "in_repair");
    const removed = (await agent.delete(`/admin/repairs/${repair.id}/parts/${line.id}`).expect(200)).body.data;
    expect(removed.status).toBe("quote");
    expect(await stockOf(part.id)).toBe(5);
    expect((await movementsOf(part.id)).map((movement) => movement.kind)).toEqual(["repair", "repair_return"]);
  });
});

describe("les rôles", () => {
  it("un anonyme reçoit 401 sur le changement d'étape (les droits par rôle sont dans repairRoles.test.ts)", async () => {
    expect((await request(app).post("/admin/repairs/1/status").send({ status: "quote" })).status).toBe(401);
  });
});

// Un devis refusé (relecture finale) : le client ne paie ni les pièces ni la main-d'œuvre du devis refusé. Il ne
// reste que des frais de diagnostic saisis à la main, et la fiche garde la trace du refus jusqu'au Rendu.
describe("un devis refusé", () => {
  it("remet la main-d'œuvre à zéro, ne compte plus les pièces et garde le refus après le Rendu", async () => {
    const agent = await adminAgent();
    const part = await makePart("Écran iPhone 13", 5, 8_000, 12_000);
    const repair = await makeRepair(agent, { laborPrice: 3_000 });
    await addLineOk(agent, repair.id, part.id, 1);
    await setStatusOk(agent, repair.id, "quote");

    const refused = (await setStatusOk(agent, repair.id, "to_return")) as unknown as { laborPrice: number | null; total: number; refused: boolean };
    expect(refused).toMatchObject({ laborPrice: null, total: 0, refused: true });
    const row = (await agent.get("/admin/repairs").query({ stage: "to_return" }).expect(200)).body.data[0];
    expect(row).toMatchObject({ total: 0, refused: true });

    // Des frais de diagnostic voulus : une saisie à la main avant de rendre.
    const diagnostic = (await agent.patch(`/admin/repairs/${repair.id}`).send({ laborPrice: 500 }).expect(200)).body.data;
    expect(diagnostic.total).toBe(500);

    await agent.post("/admin/cash/open").send({ openingFloat: 1_000 }).expect(201);
    await setStatusOk(agent, repair.id, "returned", "cash");
    const done = (await agent.get(`/admin/repairs/${repair.id}`).expect(200)).body.data;
    expect(done).toMatchObject({ status: "returned", refused: true, total: 500 });
  });

  it("une fiche non refusée n'est pas marquée refusée", async () => {
    const agent = await adminAgent();
    const repair = await makeRepair(agent);
    expect((await agent.get(`/admin/repairs/${repair.id}`).expect(200)).body.data.refused).toBe(false);
  });
});
