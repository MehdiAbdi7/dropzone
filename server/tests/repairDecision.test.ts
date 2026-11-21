import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { trackLimiter } from "../src/middlewares/rateLimiters.js";
import { repairTrackRouter } from "../src/modules/repairs/repairTrack.routes.js";
import { resetDb } from "./helpers.js";
import { addLineOk, adminAgent, makePart, makeRepair, makeWarrantyRepair, setStatusOk, stockOf } from "./repairHelpers.js";

// Le client accepte ou refuse son devis depuis le suivi public (21/11) : le numéro et le téléphone dans le corps d'un
// POST, sans connexion. Seule l'étape « Devis à valider » attend sa réponse.
beforeEach(resetDb);

const PHONE = "0550123456";
const decide = (body: Record<string, unknown>) => request(app).post("/repairs/track/decision").send(body);

// Une fiche hors garantie au devis, avec une pièce (2 en stock sur 5, prix de vente 6 000).
async function quoted() {
  const agent = await adminAgent();
  const part = await makePart("Batterie iPhone 13", 5, 3_500, 6_000);
  const repair = await makeRepair(agent, { laborPrice: 1_000 });
  await addLineOk(agent, repair.id, part.id, 2);
  await setStatusOk(agent, repair.id, "quote");
  return { agent, part, repair };
}

// Le total que le client a lu (2 × 6 000 + 1 000 de main-d'œuvre) : accepter l'envoie, le serveur le compare.
const SEEN = 13_000;

describe("POST /repairs/track/decision : accepter", () => {
  it("passe la fiche En réparation, sort les pièces du stock et rend le suivi à jour", async () => {
    const { part, repair } = await quoted();
    const response = await decide({ number: repair.number, phone: PHONE, decision: "accept", total: SEEN });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.data).toMatchObject({ status: "in_repair", refused: false });
    expect(response.body.data.quote).toMatchObject({ total: 13_000 });
    expect(await stockOf(part.id)).toBe(3);
  });

  it("garde la trace sans compte : l'événement et le mouvement de stock n'ont pas d'auteur", async () => {
    const { part, repair } = await quoted();
    await decide({ number: repair.number, phone: PHONE, decision: "accept", total: SEEN }).expect(200);
    const event = await prisma.repairEvent.findFirstOrThrow({ where: { repairId: repair.id, status: "in_repair" } });
    expect(event.userId).toBeNull();
    const movement = await prisma.partMovement.findFirstOrThrow({ where: { partId: part.id, kind: "repair" } });
    expect(movement.userId).toBeNull();
  });

  it("une pièce qui n'est plus en stock : refusé avec un message pour le client, la fiche reste au devis", async () => {
    const { agent, part, repair } = await quoted();
    await prisma.part.update({ where: { id: part.id }, data: { stock: 1 } });
    const response = await decide({ number: repair.number, phone: PHONE, decision: "accept", total: SEEN });
    expect(response.status).toBe(409);
    expect(response.body.error.message).toBe("Une pièce du devis n'est plus disponible : le magasin vous appelle.");
    expect((await agent.get(`/admin/repairs/${repair.id}`).expect(200)).body.data.status).toBe("quote");
  });

  // Relecture de sécurité : le technicien peut corriger le prix tant que la fiche est à « Devis à valider ». Le client
  // n'accepte que ce qu'il a lu : le total qu'il a vu est comparé, dans la transaction de l'accord, au devis d'aujourd'hui.
  it("le devis a changé depuis que le client l'a lu (main-d'œuvre) : refusé, la fiche reste au devis, rien ne sort du stock", async () => {
    const { agent, part, repair } = await quoted();
    await agent.patch(`/admin/repairs/${repair.id}`).send({ laborPrice: 5_000 }).expect(200);
    const response = await decide({ number: repair.number, phone: PHONE, decision: "accept", total: SEEN });
    expect(response.status).toBe(409);
    expect(response.body.error.message).toBe("Le devis a changé : relisez-le avant de répondre.");
    expect((await agent.get(`/admin/repairs/${repair.id}`).expect(200)).body.data.status).toBe("quote");
    expect(await stockOf(part.id)).toBe(5);
    // Le client relit : le suivi donne le nouveau total, qu'il peut alors accepter.
    const tracked = await request(app).post("/repairs/track").send({ number: repair.number, phone: PHONE }).expect(200);
    expect(tracked.body.data.quote.total).toBe(17_000);
    await decide({ number: repair.number, phone: PHONE, decision: "accept", total: 17_000 }).expect(200);
  });

  it("le devis a changé (une pièce de plus) : refusé aussi", async () => {
    const { agent, repair } = await quoted();
    await addLineOk(agent, repair.id, (await makePart("Nappe", 4, 500, 1_000)).id, 1);
    const response = await decide({ number: repair.number, phone: PHONE, decision: "accept", total: SEEN });
    expect(response.status).toBe(409);
    expect(response.body.error.message).toBe("Le devis a changé : relisez-le avant de répondre.");
  });

  it("accepter sans dire quel total le client a lu est refusé", async () => {
    const { repair } = await quoted();
    expect((await decide({ number: repair.number, phone: PHONE, decision: "accept" })).status).toBe(400);
    expect((await decide({ number: repair.number, phone: PHONE, decision: "accept", total: -1 })).status).toBe(400);
    expect((await decide({ number: repair.number, phone: PHONE, decision: "accept", total: "beaucoup" })).status).toBe(400);
  });
});

describe("POST /repairs/track/decision : refuser", () => {
  it("passe la fiche À rendre sans réparation, sans frais, et le suivi le dit", async () => {
    const { agent, part, repair } = await quoted();
    const response = await decide({ number: repair.number, phone: PHONE, decision: "refuse" });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.data).toMatchObject({ status: "to_return", refused: true, price: 0, quote: null });
    expect(await stockOf(part.id)).toBe(5);
    expect((await agent.get(`/admin/repairs/${repair.id}`).expect(200)).body.data.status).toBe("to_return");
  });
});

describe("POST /repairs/track/decision : ce qui est refusé", () => {
  it("un mauvais téléphone et un numéro inconnu donnent la même réponse que le suivi", async () => {
    const { repair } = await quoted();
    const wrongPhone = await decide({ number: repair.number, phone: "0661000000", decision: "accept", total: SEEN });
    const unknown = await decide({ number: 9_999, phone: PHONE, decision: "accept", total: SEEN });
    expect(wrongPhone.status).toBe(404);
    expect(unknown.status).toBe(404);
    expect(wrongPhone.body).toEqual(unknown.body);
    expect(wrongPhone.body.error.message).toBe("Aucune réparation ne correspond à ce numéro et ce téléphone");
  });

  it("hors de l'étape Devis à valider, aucune décision : reçu, en réparation, rendu, sous garantie", async () => {
    const agent = await adminAgent();
    const received = await makeRepair(agent, { laborPrice: 1_000 });
    const response = await decide({ number: received.number, phone: PHONE, decision: "accept", total: 1_000 });
    expect(response.status).toBe(409);
    expect(response.body.error.message).toBe("Ce devis n'attend plus de réponse");
    expect((await agent.get(`/admin/repairs/${received.id}`).expect(200)).body.data.status).toBe("received");

    const warranty = await makeWarrantyRepair(agent);
    expect((await decide({ number: warranty.number, phone: PHONE, decision: "refuse" })).status).toBe(409);
  });

  it("une réponse déjà donnée ne se change pas : accepter puis refuser est refusé", async () => {
    const { repair } = await quoted();
    await decide({ number: repair.number, phone: PHONE, decision: "accept", total: SEEN }).expect(200);
    expect((await decide({ number: repair.number, phone: PHONE, decision: "refuse" })).status).toBe(409);
  });

  it("refuse une décision inconnue, un numéro absurde, un téléphone invalide", async () => {
    for (const bad of [{ decision: "peut-être" }, { decision: undefined }, { number: 0 }, { number: "abc" }, { phone: "123" }]) {
      const response = await decide({ number: 1001, phone: PHONE, decision: "accept", total: SEEN, ...bad });
      expect(response.status, JSON.stringify(bad)).toBe(400);
    }
  });

  it("utilise le même limiteur d'essais que le suivi", () => {
    const layers = repairTrackRouter.stack.flatMap((layer) => (layer.route?.path === "/track/decision" ? layer.route.stack.map((entry) => entry.handle) : []));
    expect(layers).toContain(trackLimiter);
  });
});
