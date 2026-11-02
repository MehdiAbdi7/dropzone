import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { PASSWORD, createUser, loginAs, resetDb } from "./helpers.js";

const newUser = {
  firstName: "Sara",
  lastName: "Benali",
  email: "Sara@Mail.com",
  password: "unmotdepasse",
  phone: "0770 11 22 33",
};

beforeEach(resetDb);

describe("Inscription", () => {
  it("crée le compte, pose un cookie httpOnly et ne renvoie jamais le hash", async () => {
    const response = await request(app).post("/auth/register").send(newUser);
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ email: "sara@mail.com", role: "customer", phone: "0770112233" });
    expect(response.body.data.passwordHash).toBeUndefined();
    expect(response.headers["set-cookie"]?.[0]).toMatch(/^token=.+HttpOnly/);
  });

  it("refuse le même email écrit avec d'autres majuscules", async () => {
    await request(app).post("/auth/register").send(newUser).expect(201);
    const response = await request(app)
      .post("/auth/register")
      .send({ ...newUser, email: "sara@mail.com" });
    expect(response.status).toBe(409);
  });

  it("refuse un mot de passe trop court", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({ ...newUser, password: "court" });
    expect(response.status).toBe(400);
    expect(response.body.error.details.password).toBeDefined();
  });
});

describe("Connexion", () => {
  it("donne le même message pour un email inconnu et un mauvais mot de passe", async () => {
    await createUser("customer", "amine@test.dz");
    const wrongPassword = await request(app)
      .post("/auth/login")
      .send({ email: "amine@test.dz", password: "pasbon123" });
    const unknownEmail = await request(app)
      .post("/auth/login")
      .send({ email: "inconnu@test.dz", password: PASSWORD });
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });

  it("répond 401 sur /auth/me sans cookie", async () => {
    const response = await request(app).get("/auth/me");
    expect(response.status).toBe(401);
  });

  it("renvoie le profil connecté, puis plus rien après la déconnexion", async () => {
    const { agent } = await loginAs("customer", "amine@test.dz");
    expect((await agent.get("/auth/me")).body.data.email).toBe("amine@test.dz");
    await agent.post("/auth/logout").expect(204);
    expect((await agent.get("/auth/me")).status).toBe(401);
  });
});

describe("PATCH /auth/me", () => {
  it("modifie le profil mais ignore le rôle et l'email", async () => {
    const { agent } = await loginAs("customer", "amine@test.dz");
    const response = await agent
      .patch("/auth/me")
      .send({ firstName: "Mehdi", addressWilaya: "Blida", role: "admin", email: "pirate@test.dz" });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      firstName: "Mehdi",
      addressWilaya: "Blida",
      role: "customer",
      email: "amine@test.dz",
    });
  });
});
