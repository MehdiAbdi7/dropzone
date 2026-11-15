import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { PASSWORD, createUser, loginAs, resetDb } from "./helpers.js";

// Mon compte (15/11) : changer son mot de passe et son email, toujours en redonnant le mot de passe actuel.
// Quelqu'un qui tombe sur une session ouverte ne peut donc pas prendre le compte.
beforeEach(resetDb);

const canLogin = async (email: string, password: string) =>
  (await request(app).post("/auth/login").send({ email, password })).status === 200;

describe("PATCH /auth/password", () => {
  it("change le mot de passe : l'ancien ne marche plus, le nouveau marche", async () => {
    const { agent, user } = await loginAs("admin", "boss@test.dz");
    const response = await agent.patch("/auth/password").send({ currentPassword: PASSWORD, newPassword: "nouveaumotdepasse" });
    expect(response.status).toBe(200);
    expect(await canLogin(user.email, "nouveaumotdepasse")).toBe(true);
    expect(await canLogin(user.email, PASSWORD)).toBe(false);
  });

  it("enregistre un hash, jamais le mot de passe", async () => {
    const { agent, user } = await loginAs("admin", "boss@test.dz");
    await agent.patch("/auth/password").send({ currentPassword: PASSWORD, newPassword: "nouveaumotdepasse" }).expect(200);
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, omit: { passwordHash: false } });
    expect(saved.passwordHash).not.toBe("nouveaumotdepasse");
    expect(saved.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it("refuse un mauvais mot de passe actuel, rien ne change", async () => {
    const { agent, user } = await loginAs("admin", "boss@test.dz");
    const response = await agent.patch("/auth/password").send({ currentPassword: "pasbon1234", newPassword: "nouveaumotdepasse" });
    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/actuel/i);
    expect(await canLogin(user.email, PASSWORD)).toBe(true);
  });

  it("refuse un nouveau mot de passe trop court, trop long ou identique à l'actuel", async () => {
    const { agent } = await loginAs("admin", "boss@test.dz");
    expect((await agent.patch("/auth/password").send({ currentPassword: PASSWORD, newPassword: "court" })).status).toBe(400);
    expect((await agent.patch("/auth/password").send({ currentPassword: PASSWORD, newPassword: "x".repeat(73) })).status).toBe(400);
    const same = await agent.patch("/auth/password").send({ currentPassword: PASSWORD, newPassword: PASSWORD });
    expect(same.status).toBe(400);
    expect(same.body.error.message).toMatch(/différent/i);
  });

  it("demande d'être connecté", async () => {
    const response = await request(app).patch("/auth/password").send({ currentPassword: PASSWORD, newPassword: "nouveaumotdepasse" });
    expect(response.status).toBe(401);
  });
});

describe("PATCH /auth/email", () => {
  it("change l'email, écrit en minuscules : l'ancien ne connecte plus, le nouveau connecte", async () => {
    const { agent, user } = await loginAs("admin", "boss@test.dz");
    const response = await agent.patch("/auth/email").send({ currentPassword: PASSWORD, email: "Nouveau@Mail.com" });
    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe("nouveau@mail.com");
    expect(response.body.data.passwordHash).toBeUndefined();
    expect(await canLogin("nouveau@mail.com", PASSWORD)).toBe(true);
    expect(await canLogin(user.email, PASSWORD)).toBe(false);
  });

  it("refuse un mauvais mot de passe actuel, l'email ne change pas", async () => {
    const { agent, user } = await loginAs("admin", "boss@test.dz");
    const response = await agent.patch("/auth/email").send({ currentPassword: "pasbon1234", email: "nouveau@mail.com" });
    expect(response.status).toBe(400);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).email).toBe(user.email);
  });

  it("refuse un email déjà pris par un autre compte, même écrit autrement", async () => {
    await createUser("customer", "client@test.dz");
    const { agent } = await loginAs("admin", "boss@test.dz");
    const response = await agent.patch("/auth/email").send({ currentPassword: PASSWORD, email: "CLIENT@test.dz" });
    expect(response.status).toBe(409);
  });

  it("refuse un email invalide ou identique à l'actuel", async () => {
    const { agent, user } = await loginAs("admin", "boss@test.dz");
    expect((await agent.patch("/auth/email").send({ currentPassword: PASSWORD, email: "pas-un-email" })).status).toBe(400);
    const same = await agent.patch("/auth/email").send({ currentPassword: PASSWORD, email: user.email });
    expect(same.status).toBe(400);
    expect(same.body.error.message).toMatch(/déjà/i);
  });

  it("demande d'être connecté", async () => {
    expect((await request(app).patch("/auth/email").send({ currentPassword: PASSWORD, email: "nouveau@mail.com" })).status).toBe(401);
  });
});
