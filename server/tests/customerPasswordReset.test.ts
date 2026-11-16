import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { PASSWORD, createUser, loginAs, resetDb } from "./helpers.js";

// Réinitialiser le mot de passe d'un CLIENT depuis le back-office (15/11) : il n'y a pas de « mot de passe oublié »
// par email, c'est l'admin qui en choisit un nouveau et le donne au client. Jamais pour un compte administrateur.
beforeEach(resetDb);

const canLogin = async (email: string, password: string) =>
  (await request(app).post("/auth/login").send({ email, password })).status === 200;

describe("POST /admin/customers/:id/password", () => {
  it("donne un nouveau mot de passe au client : l'ancien ne marche plus, le nouveau marche", async () => {
    const customer = await createUser("customer", "client@test.dz");
    const { agent } = await loginAs("admin", "boss@test.dz");
    const response = await agent.post(`/admin/customers/${customer.id}/password`).send({ newPassword: "nouveaumotdepasse" });
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ changed: true });
    expect(await canLogin("client@test.dz", "nouveaumotdepasse")).toBe(true);
    expect(await canLogin("client@test.dz", PASSWORD)).toBe(false);
  });

  it("enregistre un hash et ne change que le mot de passe", async () => {
    const customer = await createUser("customer", "client@test.dz");
    const { agent } = await loginAs("admin", "boss@test.dz");
    await agent.post(`/admin/customers/${customer.id}/password`).send({ newPassword: "nouveaumotdepasse" }).expect(200);
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: customer.id }, omit: { passwordHash: false } });
    expect(saved.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(saved.passwordHash).not.toContain("nouveaumotdepasse");
    expect(saved).toMatchObject({ email: "client@test.dz", role: "customer", firstName: customer.firstName });
  });

  it("refuse un mot de passe trop court ou trop long", async () => {
    const customer = await createUser("customer", "client@test.dz");
    const { agent } = await loginAs("admin", "boss@test.dz");
    expect((await agent.post(`/admin/customers/${customer.id}/password`).send({ newPassword: "court" })).status).toBe(400);
    expect((await agent.post(`/admin/customers/${customer.id}/password`).send({ newPassword: "x".repeat(73) })).status).toBe(400);
    expect(await canLogin("client@test.dz", PASSWORD)).toBe(true);
  });

  it("ne touche jamais un compte administrateur, même celui de l'admin qui le demande", async () => {
    const { agent, user } = await loginAs("admin", "boss@test.dz");
    const other = await createUser("admin", "autre-admin@test.dz");
    expect((await agent.post(`/admin/customers/${other.id}/password`).send({ newPassword: "nouveaumotdepasse" })).status).toBe(404);
    expect((await agent.post(`/admin/customers/${user.id}/password`).send({ newPassword: "nouveaumotdepasse" })).status).toBe(404);
    expect(await canLogin("autre-admin@test.dz", PASSWORD)).toBe(true);
  });

  it("un client inconnu : 404", async () => {
    const { agent } = await loginAs("admin", "boss@test.dz");
    expect((await agent.post("/admin/customers/99999/password").send({ newPassword: "nouveaumotdepasse" })).status).toBe(404);
  });

  it("est réservé à l'administrateur", async () => {
    const victim = await createUser("customer", "victime@test.dz");
    const { agent } = await loginAs("customer", "pirate@test.dz");
    expect((await agent.post(`/admin/customers/${victim.id}/password`).send({ newPassword: "nouveaumotdepasse" })).status).toBe(403);
    expect((await request(app).post(`/admin/customers/${victim.id}/password`).send({ newPassword: "nouveaumotdepasse" })).status).toBe(401);
    expect(await canLogin("victime@test.dz", PASSWORD)).toBe(true);
  });
});
