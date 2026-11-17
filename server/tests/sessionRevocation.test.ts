import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { env } from "../src/config/env.js";
import { prisma } from "../src/config/db.js";
import { PASSWORD, createUser, loginAs, resetDb } from "./helpers.js";

// Lot 7, revue de sécurité : un mot de passe réinitialisé ou un compte désactivé coupe aussi les sessions déjà
// ouvertes (le cookie de connexion dure 7 jours), même si le compte est réactivé ensuite.
beforeEach(resetDb);

const canLogin = async (email: string, password: string) =>
  (await request(app).post("/auth/login").send({ email, password })).status === 200;

describe("réinitialiser un mot de passe coupe les sessions ouvertes", () => {
  it("un vendeur connecté est déconnecté quand l'admin lui donne un nouveau mot de passe", async () => {
    const seller = await loginAs("seller", "vendeur@test.dz");
    const { agent } = await loginAs("admin", "boss@test.dz");
    await seller.agent.get("/auth/me").expect(200);
    await agent.post(`/admin/accounts/${seller.user.id}/password`).send({ newPassword: "nouveaumotdepasse" }).expect(200);
    expect((await seller.agent.get("/auth/me")).status).toBe(401);
    expect(await canLogin("vendeur@test.dz", "nouveaumotdepasse")).toBe(true);
  });

  it("de même pour un client dont l'admin change le mot de passe", async () => {
    const customer = await loginAs("customer", "client@test.dz");
    const { agent } = await loginAs("admin", "boss@test.dz");
    await agent.post(`/admin/customers/${customer.user.id}/password`).send({ newPassword: "nouveaumotdepasse" }).expect(200);
    expect((await customer.agent.get("/auth/me")).status).toBe(401);
  });
});

describe("désactiver puis réactiver ne ressuscite pas une ancienne session", () => {
  it("l'ancien cookie reste refusé, une nouvelle connexion marche", async () => {
    const seller = await loginAs("seller", "vendeur@test.dz");
    const { agent } = await loginAs("admin", "boss@test.dz");
    await agent.patch(`/admin/accounts/${seller.user.id}`).send({ disabled: true }).expect(200);
    await agent.patch(`/admin/accounts/${seller.user.id}`).send({ disabled: false }).expect(200);
    expect((await seller.agent.get("/auth/me")).status).toBe(401);
    expect(await canLogin("vendeur@test.dz", PASSWORD)).toBe(true);
  });
});

describe("les sessions qui doivent survivre", () => {
  it("un changement de rôle garde la session ouverte (le rôle est relu en base à chaque requête)", async () => {
    const seller = await loginAs("seller", "vendeur@test.dz");
    const { agent } = await loginAs("admin", "boss@test.dz");
    await agent.patch(`/admin/accounts/${seller.user.id}`).send({ role: "order_manager" }).expect(200);
    expect((await seller.agent.get("/auth/me")).status).toBe(200);
  });

  it("un cookie d'avant cette version (sans numéro de version) reste valable tant que rien n'est révoqué", async () => {
    const user = await createUser("seller", "vendeur@test.dz");
    const oldToken = jwt.sign({ role: "seller" }, env.JWT_SECRET, { subject: String(user.id), expiresIn: "7d" });
    expect((await request(app).get("/auth/me").set("Cookie", `token=${oldToken}`)).status).toBe(200);
    await prisma.user.update({ where: { id: user.id }, data: { tokenVersion: { increment: 1 } } });
    expect((await request(app).get("/auth/me").set("Cookie", `token=${oldToken}`)).status).toBe(401);
  });
});

describe("le numéro de version ne sort jamais de l'API", () => {
  it("ni à l'inscription, ni à la connexion, ni dans « mon profil »", async () => {
    const registered = await request(app).post("/auth/register").send({
      firstName: "Amine",
      lastName: "Test",
      email: "nouveau@test.dz",
      password: "motdepasse123",
      phone: "0555123456",
    });
    expect(registered.status).toBe(201);
    const login = await request(app).post("/auth/login").send({ email: "nouveau@test.dz", password: "motdepasse123" });
    const agent = request.agent(app);
    await agent.post("/auth/login").send({ email: "nouveau@test.dz", password: "motdepasse123" });
    const me = await agent.get("/auth/me");
    for (const response of [registered, login, me]) expect(JSON.stringify(response.body)).not.toMatch(/tokenVersion|token_version/);
  });
});
