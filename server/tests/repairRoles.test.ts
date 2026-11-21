import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { loginAs, partCategoryId, resetDb } from "./helpers.js";
import { addLineOk, adminAgent, device, makePart, makeRepair, makeWarrantyRepair, openCash, readyRepair, setStatusOk, type Agent } from "./repairHelpers.js";

// Qui fait quoi dans l'atelier (étape 5, cahier §11 et §14), essayé avec de vrais comptes.
beforeEach(resetDb);

const as = async (role: "technician" | "seller" | "order_manager") => (await loginAs(role, `${role}@roles.dz`)).agent;

// Toutes les clés d'un JSON, à toute profondeur.
function keysOf(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((item) => keysOf(item, found));
  else if (value && typeof value === "object") {
    for (const [key, inner] of Object.entries(value)) {
      found.add(key);
      keysOf(inner, found);
    }
  }
  return found;
}

describe("le technicien dans une fiche", () => {
  it("fait avancer une réparation sous garantie : En réparation puis Prêt", async () => {
    const admin = await adminAgent();
    const tech = await as("technician");
    const repair = await makeWarrantyRepair(admin);
    expect((await tech.post(`/admin/repairs/${repair.id}/status`).send({ status: "in_repair" })).status).toBe(200);
    expect((await tech.post(`/admin/repairs/${repair.id}/status`).send({ status: "ready" })).status).toBe(200);
  });

  // Décision de Mehdi (21/11) : le technicien a toutes les infos de son travail et fixe le prix de la réparation. Le
  // « oui » du client hors garantie, le devis et son refus sont donc aussi à lui.
  it("hors garantie, enregistre l'accord du client : En réparation, et les pièces sortent du stock", async () => {
    const admin = await adminAgent();
    const tech = await as("technician");
    const part = await makePart();
    const repair = await makeRepair(admin);
    await addLineOk(admin, repair.id, part.id, 1);
    expect((await tech.post(`/admin/repairs/${repair.id}/status`).send({ status: "in_repair" })).status).toBe(200);
    expect((await admin.get(`/admin/repairs/${repair.id}`).expect(200)).body.data.status).toBe("in_repair");
  });

  it("propose le devis, le refuse (à rendre sans réparation), mais ne rend jamais l'appareil (même avec un moyen de paiement)", async () => {
    const admin = await adminAgent();
    await openCash(admin);
    const tech = await as("technician");
    const first = await makeRepair(admin);
    expect((await tech.post(`/admin/repairs/${first.id}/status`).send({ status: "quote" })).status).toBe(200);
    expect((await tech.post(`/admin/repairs/${first.id}/status`).send({ status: "to_return" })).status).toBe(200);
    const { repair } = await readyRepair(admin);
    const returned = await tech.post(`/admin/repairs/${repair.id}/status`).send({ status: "returned", method: "cash" });
    expect(returned.status).toBe(403);
    expect(returned.body.error.message).toBe("Ce geste est réservé à la vente");
    expect((await admin.get(`/admin/repairs/${repair.id}`).expect(200)).body.data.status).toBe("ready");
  });

  it("fixe la main-d'œuvre et modifie toute la fiche", async () => {
    const admin = await adminAgent();
    const tech = await as("technician");
    const repair = await makeRepair(admin, { laborPrice: 1_000 });
    expect((await tech.patch(`/admin/repairs/${repair.id}`).send({ note: "Vitre arrière aussi" })).status).toBe(200);
    expect((await tech.patch(`/admin/repairs/${repair.id}`).send({ note: "x", laborPrice: 2_500 })).status).toBe(200);
    expect((await tech.patch(`/admin/repairs/${repair.id}`).send({ deviceName: "Autre" })).status).toBe(200);
    const detail = (await admin.get(`/admin/repairs/${repair.id}`).expect(200)).body.data;
    expect(detail).toMatchObject({ laborPrice: 2_500, note: "x", deviceName: "Autre" });
  });

  it("crée une fiche : appareil, client, panne ; la réponse porte le prix de la fiche", async () => {
    const tech = await as("technician");
    const created = await tech.post("/admin/repairs").send({ ...device, laborPrice: 1_500 });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ number: 1001, status: "received", deviceName: "iPhone 13", laborPrice: 1_500 });
    expect((await tech.get(`/admin/repairs/${created.body.data.id}`)).status).toBe(200);
  });

  it("fixe à la création le prix et « hors garantie forcé »", async () => {
    const tech = await as("technician");
    expect((await tech.post("/admin/repairs").send({ ...device, laborPrice: 0 })).status).toBe(201);
    expect((await tech.post("/admin/repairs").send({ ...device, forceOutOfWarranty: true })).status).toBe(201);
  });

  it("cherche la garantie de l'appareil et la rattache à la fiche", async () => {
    const tech = await as("technician");
    const order = await prisma.order.create({
      data: {
        fullName: "Karim Benali",
        phone: "0550123456",
        type: "in_store",
        status: "picked_up",
        dailyNumber: 1,
        businessDate: new Date("2026-11-18"),
        subtotal: 80_000,
        shippingFee: 0,
        total: 80_000,
        items: { create: [{ sku: "IP13-128", name: "iPhone 13", unitPrice: 80_000, quantity: 1, warrantyMonths: 12 }] },
      },
      select: { items: { select: { id: true } } },
    });
    const hits = await tech.get("/admin/repairs/warranty").query({ phone: "0550123456" }).expect(200);
    expect(hits.body.data[0]).toMatchObject({ itemId: order.items[0].id, underWarranty: true });
    const created = await tech.post("/admin/repairs").send({ ...device, originItemId: order.items[0].id });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ underWarranty: true, nextStatuses: ["in_repair"] });
  });

  it("ne supprime pas une fiche", async () => {
    const admin = await adminAgent();
    const tech = await as("technician");
    const repair = await makeRepair(admin);
    expect((await tech.delete(`/admin/repairs/${repair.id}`)).status).toBe(403);
  });

  it("choisit les pièces d'une fiche : ajouter, changer, retirer", async () => {
    const admin = await adminAgent();
    const tech = await as("technician");
    const part = await makePart();
    const repair = await makeRepair(admin);
    const added = await tech.post(`/admin/repairs/${repair.id}/parts`).send({ partId: part.id, quantity: 1 });
    expect(added.status).toBe(200);
    const line = added.body.data.parts[0];
    expect((await tech.patch(`/admin/repairs/${repair.id}/parts/${line.id}`).send({ quantity: 2 })).status).toBe(200);
    expect((await tech.delete(`/admin/repairs/${repair.id}/parts/${line.id}`)).status).toBe(200);
  });

  it("reçoit l'argent du client ET le prix d'achat de son travail, jamais le bénéfice ni la marge", async () => {
    const admin = await adminAgent();
    await openCash(admin);
    const tech = await as("technician");
    const { repair } = await readyRepair(admin);
    await setStatusOk(admin, repair.id, "returned", "cash");
    const part = await makePart("Nappe", 3, 700, 1_500);
    const open = await makeRepair(admin, { laborPrice: 500 });
    await addLineOk(admin, open.id, part.id, 1);

    const bodies = [
      (await tech.get("/admin/repairs").query({ stage: "returned" }).expect(200)).body,
      (await tech.get("/admin/repairs").expect(200)).body,
      (await tech.get(`/admin/repairs/${repair.id}`).expect(200)).body,
      (await tech.get(`/admin/repairs/${open.id}`).expect(200)).body,
      (await tech.get("/admin/repairs/counts").expect(200)).body,
    ];
    // Le bénéfice et la marge ne sortent jamais vers un non-admin ; le reste est à lui.
    for (const body of bodies) {
      for (const key of ["profit", "margin"]) expect(keysOf(body).has(key), key).toBe(false);
    }
    const detail = bodies[3].data;
    expect(detail).toMatchObject({ laborPrice: 500, total: 2_000 });
    expect(detail.parts[0]).toMatchObject({ unitCost: 700, unitPrice: 1_500 });
    expect(bodies[2].data).toMatchObject({ partsCost: 3_500, paidAmount: expect.any(Number) });
  });
});

describe("les pièces et le technicien", () => {
  it("voit la liste avec le prix d'achat, crée une pièce, enregistre un arrivage et lit le journal", async () => {
    const tech = await as("technician");
    const created = await tech.post("/admin/parts").send({ name: "Batterie iPhone 13", categoryId: await partCategoryId(), purchasePrice: 3_500, salePrice: 6_000, stock: 2 });
    expect(created.status).toBe(201);
    const id = created.body.data.id as number;
    expect((await tech.get("/admin/parts").expect(200)).body.data[0]).toMatchObject({ purchasePrice: 3_500, salePrice: 6_000 });
    expect((await tech.post(`/admin/parts/${id}/arrivals`).send({ quantity: 2, unitCost: 3_000 })).status).toBe(200);
    const movements = (await tech.get(`/admin/parts/${id}/movements`).expect(200)).body.data;
    expect(movements[0]).toMatchObject({ kind: "arrival", unitCost: 3_000 });
  });

  it("ne modifie pas une pièce, ne corrige pas un stock", async () => {
    const tech = await as("technician");
    const part = await makePart();
    expect((await tech.patch(`/admin/parts/${part.id}`).send({ salePrice: 1 })).status).toBe(403);
    expect((await tech.post(`/admin/parts/${part.id}/corrections`).send({ stock: 1 })).status).toBe(403);
  });
});

describe("le vendeur et le responsable commande", () => {
  const roles = ["seller", "order_manager"] as const;

  it.each(roles)("le %s crée une fiche, fixe la main-d'œuvre, rend l'appareil et encaisse", async (role) => {
    const admin = await adminAgent();
    await openCash(admin);
    const agent = await as(role);
    const created = await agent.post("/admin/repairs").send(device);
    expect(created.status).toBe(201);
    const id = created.body.data.id as number;
    expect((await agent.patch(`/admin/repairs/${id}`).send({ laborPrice: 2_000 })).status).toBe(200);
    for (const status of ["in_repair", "ready"]) {
      expect((await agent.post(`/admin/repairs/${id}/status`).send({ status })).status, status).toBe(200);
    }
    expect((await agent.post(`/admin/repairs/${id}/status`).send({ status: "returned", method: "cash" })).status).toBe(200);
  });

  it.each(roles)("le %s ne reçoit aucun prix d'achat : ni d'une pièce, ni d'une ligne, ni du coût d'une fiche rendue", async (role) => {
    const admin = await adminAgent();
    await openCash(admin);
    const agent = await as(role);
    const { repair } = await readyRepair(admin);
    await setStatusOk(admin, repair.id, "returned", "cash");
    const bodies = [
      (await agent.get(`/admin/repairs/${repair.id}`).expect(200)).body,
      (await agent.get("/admin/repairs").query({ stage: "returned" }).expect(200)).body,
      (await agent.get("/admin/parts").expect(200)).body,
    ];
    for (const body of bodies) {
      for (const key of ["unitCost", "purchasePrice", "partsCost", "profit"]) expect(keysOf(body).has(key), `${role} ${key}`).toBe(false);
    }
    expect(bodies[2].data[0]).toMatchObject({ name: "Batterie iPhone 13", salePrice: 6_000, stock: 4 });
  });

  it.each(roles)("le %s ne gère pas le stock : 403 sur la création d'une pièce, un arrivage, le journal, la modification", async (role) => {
    const agent = await as(role);
    const part = await makePart();
    expect((await agent.post("/admin/parts").send({ name: "X", categoryId: part.categoryId, purchasePrice: 1, salePrice: 2 })).status).toBe(403);
    expect((await agent.post(`/admin/parts/${part.id}/arrivals`).send({ quantity: 1, unitCost: 1 })).status).toBe(403);
    expect((await agent.get(`/admin/parts/${part.id}/movements`)).status).toBe(403);
    expect((await agent.patch(`/admin/parts/${part.id}`).send({ salePrice: 1 })).status).toBe(403);
    expect((await agent.post(`/admin/parts/${part.id}/corrections`).send({ stock: 1 })).status).toBe(403);
  });

  it.each(roles)("le %s ne supprime pas une fiche", async (role) => {
    const admin = await adminAgent();
    const agent = await as(role);
    const repair = await makeRepair(admin);
    expect((await agent.delete(`/admin/repairs/${repair.id}`)).status).toBe(403);
  });
});

describe("un compte rétrogradé ou désactivé", () => {
  it("un technicien désactivé est refusé à la requête suivante", async () => {
    const admin: Agent = await adminAgent();
    const { agent, user } = await loginAs("technician", "gone@roles.dz");
    expect((await agent.get("/admin/repairs")).status).toBe(200);
    await admin.patch(`/admin/accounts/${user.id}`).send({ disabled: true });
    expect((await agent.get("/admin/repairs")).status).toBe(401);
  });
});
