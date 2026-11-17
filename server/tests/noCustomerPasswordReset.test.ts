import { beforeEach, describe, expect, it } from "vitest";
import { PASSWORD, createUser, loginAs, resetDb } from "./helpers.js";
import request from "supertest";
import app from "../src/app.js";

// Décision de Mehdi du 18/11 : plus personne ne change le mot de passe d'un client depuis le back-office
// (la fonction du 15/11 est retirée). La route n'existe plus, même pour l'administrateur.
beforeEach(resetDb);

describe("POST /admin/customers/:id/password", () => {
  it("n'existe plus : 404 même pour l'administrateur, et le mot de passe du client ne change pas", async () => {
    const customer = await createUser("customer", "client@test.dz");
    const { agent } = await loginAs("admin", "admin@test.dz");
    const response = await agent.post(`/admin/customers/${customer.id}/password`).send({ newPassword: "nouveaumotdepasse" });
    expect(response.status).toBe(404);
    const login = await request(app).post("/auth/login").send({ email: "client@test.dz", password: PASSWORD });
    expect(login.status).toBe(200);
  });
});
