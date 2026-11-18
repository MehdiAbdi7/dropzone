import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { trackLimiter } from "../src/middlewares/rateLimiters.js";
import { repairTrackRouter } from "../src/modules/repairs/repairTrack.routes.js";
import { resetDb } from "./helpers.js";
import { addLineOk, adminAgent, makePart, makeRepair, makeWarrantyRepair, openCash, readyRepair, setStatusOk } from "./repairHelpers.js";

// Le suivi public d'une réparation (18/11, étape 4) : le numéro et le téléphone dans le corps d'un POST, sans connexion.
beforeEach(resetDb);

const track = (body: Record<string, unknown>) => request(app).post("/repairs/track").send(body);
const NOT_FOUND = "Aucune réparation ne correspond à ce numéro et ce téléphone";

describe("POST /repairs/track", () => {
  it("trouve une fiche par son numéro et son téléphone, sans connexion", async () => {
    const agent = await adminAgent();
    const repair = await makeRepair(agent, { deviceColor: "Bleu" });
    const response = await track({ number: repair.number, phone: "05 50 12 34 56" });
    expect(response.status).toBe(200);
    expect(Object.keys(response.body.data).sort()).toEqual(
      ["deviceColor", "deviceName", "number", "price", "refused", "returnedOn", "status", "steps", "underWarranty", "warrantyEndsAt"].sort(),
    );
    expect(response.body.data).toMatchObject({ number: 1001, deviceName: "iPhone 13", deviceColor: "Bleu", status: "received", refused: false, underWarranty: false });
  });

  it("ne laisse fuiter aucun coût, aucune note, aucun nom, aucun téléphone", async () => {
    const agent = await adminAgent();
    const part = await makePart("Pièce-SECRETE-9921", 5, 3_500, 6_000);
    const repair = await makeRepair(agent, { laborPrice: 1_000 });
    await agent.patch(`/admin/repairs/${repair.id}`).send({ note: "NOTE-SECRETE-7731" }).expect(200);
    await addLineOk(agent, repair.id, part.id, 1);
    await setStatusOk(agent, repair.id, "quote");

    const body = JSON.stringify((await track({ number: repair.number, phone: "0550123456" }).expect(200)).body);

    for (const forbidden of ["NOTE-SECRETE-7731", "Pièce-SECRETE-9921", "unitCost", "partsCost", "purchasePrice", "note", "fullName", "Karim", "0550123456", "userId", "createdById", "parts"]) {
      expect(body, forbidden).not.toContain(forbidden);
    }
  });

  it("un mauvais téléphone et un numéro inconnu donnent la même réponse", async () => {
    const agent = await adminAgent();
    const repair = await makeRepair(agent);
    const wrongPhone = await track({ number: repair.number, phone: "0661000000" });
    const unknown = await track({ number: 9_999, phone: "0550123456" });
    expect(wrongPhone.status).toBe(404);
    expect(unknown.status).toBe(404);
    expect(wrongPhone.body).toEqual(unknown.body);
    expect(wrongPhone.body.error.message).toBe(NOT_FOUND);
  });

  it("un numéro de commande ne trouve pas une réparation", async () => {
    const agent = await adminAgent();
    await makeRepair(agent);
    await prisma.order.create({
      data: { fullName: "Autre", phone: "0661000000", type: "in_store", status: "picked_up", dailyNumber: 1, businessDate: new Date("2026-11-18"), subtotal: 1, shippingFee: 0, total: 1 },
    });
    expect((await track({ number: 1001, phone: "0661000000" })).status).toBe(404);
  });

  it("refuse un numéro de 0, négatif, énorme ou texte, et un téléphone invalide", async () => {
    for (const bad of [{ number: 0 }, { number: -3 }, { number: 99_999_999_999 }, { number: "abc" }, { number: 1.5 }, { phone: "123" }, { phone: "" }]) {
      const response = await track({ number: 1001, phone: "0550123456", ...bad });
      expect(response.status, JSON.stringify(bad)).toBe(400);
    }
    expect((await track({ phone: "0550123456" })).status).toBe(400);
  });

  it("utilise le même limiteur d'essais que le suivi de commande", () => {
    const layers = repairTrackRouter.stack.flatMap((layer) => (layer.route ? layer.route.stack.map((entry) => entry.handle) : []));
    expect(layers).toContain(trackLimiter);
  });
});

describe("les étapes et leurs dates", () => {
  it("donne la première date de chaque étape traversée, une étape revenue garde la sienne", async () => {
    const agent = await adminAgent();
    const part = await makePart("Batterie iPhone 13", 5, 3_500, 6_000);
    const second = await makePart("Nappe", 5, 500, 1_000);
    const repair = await makeRepair(agent);
    await addLineOk(agent, repair.id, part.id, 1);
    await setStatusOk(agent, repair.id, "quote");
    await setStatusOk(agent, repair.id, "in_repair");
    // Une pièce de plus, hors garantie : retour à « Devis » (sa première date reste celle d'avant).
    await addLineOk(agent, repair.id, second.id, 1);

    const steps = (await track({ number: repair.number, phone: "0550123456" }).expect(200)).body.data.steps as { status: string; at: string }[];

    expect(steps.map((step) => step.status)).toEqual(["received", "quote", "in_repair"]);
    const quote = await prisma.repairEvent.findFirst({ where: { repairId: repair.id, status: "quote" }, orderBy: { id: "asc" } });
    expect(new Date(steps[1].at).toISOString()).toBe(quote!.createdAt.toISOString());
  });
});

describe("le prix", () => {
  it("sous garantie : aucun prix, et la fiche le dit", async () => {
    const agent = await adminAgent();
    const repair = await makeWarrantyRepair(agent);
    const data = (await track({ number: repair.number, phone: "0550123456" }).expect(200)).body.data;
    expect(data).toMatchObject({ underWarranty: true, price: null });
    expect(data.warrantyEndsAt).toBe("2030-01-01");
  });

  it("hors garantie sans devis fixé : pas de prix", async () => {
    const agent = await adminAgent();
    const repair = await makeRepair(agent, { laborPrice: undefined });
    expect((await track({ number: repair.number, phone: "0550123456" }).expect(200)).body.data.price).toBeNull();
  });

  it("avec un devis : le total, main-d'œuvre plus pièces au prix de vente", async () => {
    const agent = await adminAgent();
    const { repair } = await readyRepair(agent);
    expect((await track({ number: repair.number, phone: "0550123456" }).expect(200)).body.data).toMatchObject({ price: 8_000, status: "ready" });
  });

  it("une main-d'œuvre à 0 sans pièce : le devis est fixé à 0", async () => {
    const agent = await adminAgent();
    const repair = await makeRepair(agent, { laborPrice: 0 });
    expect((await track({ number: repair.number, phone: "0550123456" }).expect(200)).body.data.price).toBe(0);
  });

  it("devis refusé : seuls les frais de diagnostic, jamais les pièces", async () => {
    const agent = await adminAgent();
    const part = await makePart("Écran iPhone 13", 5, 8_000, 12_000);
    const repair = await makeRepair(agent, { laborPrice: 3_000 });
    await addLineOk(agent, repair.id, part.id, 1);
    await setStatusOk(agent, repair.id, "quote");
    await setStatusOk(agent, repair.id, "to_return");
    const refused = (await track({ number: repair.number, phone: "0550123456" }).expect(200)).body.data;
    expect(refused).toMatchObject({ refused: true, price: 0, status: "to_return" });
    await agent.patch(`/admin/repairs/${repair.id}`).send({ laborPrice: 500 }).expect(200);
    expect((await track({ number: repair.number, phone: "0550123456" }).expect(200)).body.data.price).toBe(500);
  });

  it("une fiche rendue : ce qui a été payé, et le jour du Rendu", async () => {
    const agent = await adminAgent();
    await openCash(agent);
    const { repair } = await readyRepair(agent);
    await setStatusOk(agent, repair.id, "returned", "cash");
    const data = (await track({ number: repair.number, phone: "0550123456" }).expect(200)).body.data;
    expect(data).toMatchObject({ status: "returned", price: 8_000 });
    expect(data.returnedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
