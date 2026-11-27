import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { hashPin, pinMatches } from "../src/modules/costPin/costPin.service.js";
import { loginAs, resetDb } from "./helpers.js";

// Le code à 4 chiffres des prix d'achat (27/11, demande de Mehdi). L'admin le règle, les employés le tapent pour voir les
// prix d'achat. Le code est gardé chiffré, jamais renvoyé, et seul l'admin peut le régler ou le retirer.

describe("hashPin et pinMatches", () => {
  it("reconnaît le bon code et refuse un autre", () => {
    const stored = hashPin("4821");
    expect(pinMatches("4821", stored)).toBe(true);
    expect(pinMatches("4822", stored)).toBe(false);
    expect(pinMatches("", stored)).toBe(false);
  });

  it("ne garde jamais le code en clair, et deux fois le même code ne donnent pas le même texte (sel)", () => {
    const first = hashPin("4821");
    const second = hashPin("4821");
    expect(first).not.toContain("4821");
    expect(first).not.toBe(second);
    expect(pinMatches("4821", second)).toBe(true);
  });

  it("refuse un texte rangé qui n'a pas la bonne forme, sans lever d'erreur", () => {
    expect(pinMatches("4821", "")).toBe(false);
    expect(pinMatches("4821", "pasunhash")).toBe(false);
  });
});

describe("Le code des prix d'achat, de bout en bout", () => {
  let admin: Awaited<ReturnType<typeof loginAs>>["agent"];

  beforeEach(async () => {
    await resetDb();
    ({ agent: admin } = await loginAs("admin"));
  });

  const verify = (agent: typeof admin, pin: string) => agent.post("/admin/cost-pin/verify").send({ pin });

  it("sans code réglé, l'état dit « pas de code » à tous les rôles du back-office", async () => {
    expect((await admin.get("/admin/cost-pin")).body.data).toEqual({ configured: false });
    for (const role of ["seller", "order_manager", "technician"] as const) {
      const { agent } = await loginAs(role, `${role}@exemple.dz`);
      const response = await agent.get("/admin/cost-pin");
      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({ configured: false });
    }
  });

  it("l'admin règle le code, puis l'état dit qu'il existe ; le code n'est jamais renvoyé ni rangé en clair", async () => {
    const set = await admin.put("/admin/cost-pin").send({ pin: "4821" });
    expect(set.status).toBe(200);
    expect(JSON.stringify(set.body)).not.toContain("4821");

    const status = await admin.get("/admin/cost-pin");
    expect(status.body.data).toEqual({ configured: true });
    expect(JSON.stringify(status.body)).not.toContain("4821");

    const row = await prisma.storeSettings.findUniqueOrThrow({ where: { id: 1 } });
    expect(row.costPinHash).not.toBeNull();
    expect(row.costPinHash).not.toContain("4821");
  });

  it("refuse un code qui n'est pas de 4 chiffres (400)", async () => {
    for (const pin of ["123", "12345", "abcd", "12 4", "", "١٢٣٤"]) {
      expect((await admin.put("/admin/cost-pin").send({ pin })).status).toBe(400);
    }
    expect((await admin.put("/admin/cost-pin").send({})).status).toBe(400);
    expect((await admin.get("/admin/cost-pin")).body.data).toEqual({ configured: false });
  });

  it("change le code : l'ancien ne marche plus, le nouveau marche", async () => {
    await admin.put("/admin/cost-pin").send({ pin: "1111" });
    await admin.put("/admin/cost-pin").send({ pin: "2222" });
    expect((await verify(admin, "1111")).status).toBe(401);
    expect((await verify(admin, "2222")).status).toBe(200);
  });

  it("vérifie le code tapé : bon code (200), mauvais code (401)", async () => {
    await admin.put("/admin/cost-pin").send({ pin: "4821" });
    const good = await verify(admin, "4821");
    expect(good.status).toBe(200);
    expect(good.body.data).toEqual({ ok: true });
    const bad = await verify(admin, "0000");
    expect(bad.status).toBe(401);
    expect(bad.body.error.message).toBe("Code incorrect");
  });

  it("sans code réglé, il n'y a rien à déverrouiller : refusé (409), jamais « bon » par erreur", async () => {
    expect((await verify(admin, "4821")).status).toBe(409);
  });

  it("refuse un code mal formé à la vérification (400)", async () => {
    await admin.put("/admin/cost-pin").send({ pin: "4821" });
    expect((await verify(admin, "48")).status).toBe(400);
    expect((await verify(admin, "abcd")).status).toBe(400);
  });

  it("le vendeur, le responsable commande et le technicien peuvent taper le code, pas le régler ni le retirer", async () => {
    await admin.put("/admin/cost-pin").send({ pin: "4821" });
    for (const role of ["seller", "order_manager", "technician"] as const) {
      const { agent } = await loginAs(role, `${role}@exemple.dz`);
      expect((await verify(agent, "4821")).status).toBe(200);
      expect((await verify(agent, "0000")).status).toBe(401);
      expect((await agent.put("/admin/cost-pin").send({ pin: "9999" })).status).toBe(403);
      expect((await agent.delete("/admin/cost-pin")).status).toBe(403);
    }
    // Le code n'a pas bougé.
    expect((await verify(admin, "4821")).status).toBe(200);
  });

  it("un client ou un visiteur n'accède à rien (403 et 401)", async () => {
    await admin.put("/admin/cost-pin").send({ pin: "4821" });
    const { agent: customer } = await loginAs("customer");
    expect((await customer.get("/admin/cost-pin")).status).toBe(403);
    expect((await verify(customer, "4821")).status).toBe(403);
    expect((await request(app).get("/admin/cost-pin")).status).toBe(401);
    expect((await request(app).post("/admin/cost-pin/verify").send({ pin: "4821" })).status).toBe(401);
  });

  it("l'admin retire le code : plus rien n'est caché", async () => {
    await admin.put("/admin/cost-pin").send({ pin: "4821" });
    const removed = await admin.delete("/admin/cost-pin");
    expect(removed.status).toBe(200);
    expect(removed.body.data).toEqual({ configured: false });
    expect((await admin.get("/admin/cost-pin")).body.data).toEqual({ configured: false });
    expect((await prisma.storeSettings.findUniqueOrThrow({ where: { id: 1 } })).costPinHash).toBeNull();
  });

  it("aucune route publique ne laisse sortir le code ni son empreinte", async () => {
    await admin.put("/admin/cost-pin").send({ pin: "4821" });
    const row = await prisma.storeSettings.findUniqueOrThrow({ where: { id: 1 } });
    for (const path of ["/store/hours", "/store/reservation"]) {
      const body = JSON.stringify((await request(app).get(path)).body);
      expect(body).not.toContain("costPin");
      expect(body).not.toContain(row.costPinHash!);
    }
    const adminBody = JSON.stringify((await admin.get("/admin/store/reservation")).body);
    expect(adminBody).not.toContain(row.costPinHash!);
  });
});
