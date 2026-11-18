import { beforeEach, describe, expect, it } from "vitest";
import { CLIENT_MONEY_KEYS } from "../src/utils/withoutCosts.js";
import { loginAs, resetDb } from "./helpers.js";
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

  it("ne passe pas En réparation hors garantie : l'accord du client est enregistré par la vente, aucune pièce ne sort", async () => {
    const admin = await adminAgent();
    const tech = await as("technician");
    const part = await makePart();
    const repair = await makeRepair(admin);
    await addLineOk(admin, repair.id, part.id, 1);
    const response = await tech.post(`/admin/repairs/${repair.id}/status`).send({ status: "in_repair" });
    expect(response.status).toBe(403);
    expect(response.body.error.message).toBe("Ce geste est réservé à la vente");
    // Revenu au devis par une pièce de plus, il ne le revalide pas non plus.
    await setStatusOk(admin, repair.id, "in_repair");
    await addLineOk(admin, repair.id, (await makePart("Nappe", 4)).id, 1);
    expect((await admin.get(`/admin/repairs/${repair.id}`).expect(200)).body.data.status).toBe("quote");
    expect((await tech.post(`/admin/repairs/${repair.id}/status`).send({ status: "in_repair" })).status).toBe(403);
    // La vente, elle, peut.
    const seller = await as("seller");
    expect((await seller.post(`/admin/repairs/${repair.id}/status`).send({ status: "in_repair" })).status).toBe(200);
  });

  it("ne propose pas le devis, ne refuse pas, ne rend jamais l'appareil (même avec un moyen de paiement)", async () => {
    const admin = await adminAgent();
    await openCash(admin);
    const tech = await as("technician");
    const first = await makeRepair(admin);
    expect((await tech.post(`/admin/repairs/${first.id}/status`).send({ status: "quote" })).status).toBe(403);
    const { repair } = await readyRepair(admin);
    const returned = await tech.post(`/admin/repairs/${repair.id}/status`).send({ status: "returned", method: "cash" });
    expect(returned.status).toBe(403);
    expect(returned.body.error.message).toBe("Ce geste est réservé à la vente");
    const refused = await makeRepair(admin);
    await setStatusOk(admin, refused.id, "quote");
    expect((await tech.post(`/admin/repairs/${refused.id}/status`).send({ status: "to_return" })).status).toBe(403);
    expect((await admin.get(`/admin/repairs/${repair.id}`).expect(200)).body.data.status).toBe("ready");
  });

  it("ne modifie que sa note : jamais la main-d'œuvre, même mêlée à une note", async () => {
    const admin = await adminAgent();
    const tech = await as("technician");
    const repair = await makeRepair(admin, { laborPrice: 1_000 });
    expect((await tech.patch(`/admin/repairs/${repair.id}`).send({ note: "Vitre arrière aussi" })).status).toBe(200);
    expect((await tech.patch(`/admin/repairs/${repair.id}`).send({ note: "x", laborPrice: 0 })).status).toBe(403);
    expect((await tech.patch(`/admin/repairs/${repair.id}`).send({ laborPrice: 0 })).status).toBe(403);
    expect((await tech.patch(`/admin/repairs/${repair.id}`).send({ deviceName: "Autre" })).status).toBe(403);
    const detail = (await admin.get(`/admin/repairs/${repair.id}`).expect(200)).body.data;
    expect(detail).toMatchObject({ laborPrice: 1_000, note: "Vitre arrière aussi", deviceName: "iPhone 13" });
  });

  it("ne crée pas de fiche, ne cherche pas la garantie, ne supprime pas une fiche", async () => {
    const admin = await adminAgent();
    const tech = await as("technician");
    expect((await tech.post("/admin/repairs").send(device)).status).toBe(403);
    expect((await tech.get("/admin/repairs/warranty").query({ phone: "0550123456" })).status).toBe(403);
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

  it("ne reçoit AUCUNE clé d'argent du client, à toute profondeur, mais voit le prix d'achat", async () => {
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
    for (const body of bodies) {
      for (const key of CLIENT_MONEY_KEYS) expect(keysOf(body).has(key), key).toBe(false);
    }
    const detail = bodies[3].data;
    expect(detail.parts[0]).toMatchObject({ unitCost: 700 });
    expect(bodies[2].data.partsCost).toBe(3_500);
  });
});

describe("les pièces et le technicien", () => {
  it("voit la liste avec le prix d'achat, crée une pièce, enregistre un arrivage et lit le journal", async () => {
    const tech = await as("technician");
    const created = await tech.post("/admin/parts").send({ name: "Batterie iPhone 13", purchasePrice: 3_500, salePrice: 6_000, stock: 2 });
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
    expect((await agent.post("/admin/parts").send({ name: "X", purchasePrice: 1, salePrice: 2 })).status).toBe(403);
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
