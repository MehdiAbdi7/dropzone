import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { PASSWORD, createUser, loginAs, resetDb } from "./helpers.js";

// Lot 7 : désactiver un compte le coupe tout de suite, même s'il est connecté, sans le supprimer.
beforeEach(resetDb);

describe("compte désactivé", () => {
  it("un vendeur connecté puis désactivé est refusé à la requête suivante", async () => {
    const { agent, user } = await loginAs("seller", "vendeur@test.dz");
    await agent.get("/auth/me").expect(200);
    await prisma.user.update({ where: { id: user.id }, data: { disabled: true } });
    const response = await agent.get("/auth/me");
    expect(response.status).toBe(401);
  });

  it("la connexion d'un compte désactivé est refusée, avec le même message qu'un mauvais mot de passe", async () => {
    const user = await createUser("seller", "vendeur@test.dz");
    await prisma.user.update({ where: { id: user.id }, data: { disabled: true } });
    const disabled = await request(app).post("/auth/login").send({ email: user.email, password: PASSWORD });
    const wrong = await request(app).post("/auth/login").send({ email: user.email, password: "pasbon1234" });
    expect(disabled.status).toBe(401);
    expect(disabled.body.error.message).toBe(wrong.body.error.message);
  });

  it("un compte actif n'est pas touché", async () => {
    const { agent } = await loginAs("order_manager", "responsable@test.dz");
    await agent.get("/auth/me").expect(200);
  });

  it("le compte désactivé reste en base : ses ventes et ses traces gardent son nom", async () => {
    const user = await createUser("seller", "vendeur@test.dz");
    await prisma.user.update({ where: { id: user.id }, data: { disabled: true } });
    expect(await prisma.user.findUnique({ where: { id: user.id } })).not.toBeNull();
  });
});
