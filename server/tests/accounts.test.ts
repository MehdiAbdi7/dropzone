import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { updateAccount } from "../src/modules/accounts/account.service.js";
import { PASSWORD, createUser, loginAs, resetDb } from "./helpers.js";

// Lot 7 : l'admin crée les comptes du personnel (vendeur, responsable commande, autre admin), change leur
// rôle, les désactive, leur donne un nouveau mot de passe. Rien de tout cela n'est ouvert au personnel.
beforeEach(resetDb);

const canLogin = async (email: string, password: string) =>
  (await request(app).post("/auth/login").send({ email, password })).status === 200;

const newAccount = (over: Record<string, unknown> = {}) => ({
  firstName: "Sami",
  lastName: "Benali",
  email: "sami@dropzone.dz",
  phone: "0555 12 34 56",
  role: "seller",
  password: "motdepasse-provisoire",
  ...over,
});

describe("POST /admin/accounts", () => {
  it.each(["seller", "order_manager", "admin"] as const)("crée un compte %s, sans jamais renvoyer le hash", async (role) => {
    const { agent } = await loginAs("admin", "boss@test.dz");
    const response = await agent.post("/admin/accounts").send(newAccount({ role }));
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ email: "sami@dropzone.dz", role, disabled: false, firstName: "Sami" });
    expect(response.body.data.passwordHash).toBeUndefined();
    const saved = await prisma.user.findUniqueOrThrow({ where: { email: "sami@dropzone.dz" }, omit: { passwordHash: false } });
    expect(saved.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it("le nouveau vendeur se connecte, atteint la vente mais pas l'historique", async () => {
    const { agent } = await loginAs("admin", "boss@test.dz");
    await agent.post("/admin/accounts").send(newAccount()).expect(201);
    const seller = request.agent(app);
    await seller.post("/auth/login").send({ email: "sami@dropzone.dz", password: "motdepasse-provisoire" }).expect(200);
    expect((await seller.get("/admin/variants")).status).toBe(200);
    expect((await seller.get("/admin/history")).status).toBe(403);
  });

  it("écrit l'email en minuscules et refuse un email déjà pris, même écrit autrement", async () => {
    const { agent } = await loginAs("admin", "boss@test.dz");
    const first = await agent.post("/admin/accounts").send(newAccount({ email: "Sami@Dropzone.dz" }));
    expect(first.status).toBe(201);
    expect(first.body.data.email).toBe("sami@dropzone.dz");
    const second = await agent.post("/admin/accounts").send(newAccount({ email: "SAMI@dropzone.dz", firstName: "Autre" }));
    expect(second.status).toBe(409);
    expect(second.body.error.message).toMatch(/existe déjà/);
  });

  it("le téléphone est facultatif", async () => {
    const { agent } = await loginAs("admin", "boss@test.dz");
    const { phone: _phone, ...withoutPhone } = newAccount();
    expect((await agent.post("/admin/accounts").send(withoutPhone)).status).toBe(201);
  });

  it("refuse un mot de passe trop court, un email invalide, un rôle client ou inconnu, un nom vide", async () => {
    const { agent } = await loginAs("admin", "boss@test.dz");
    expect((await agent.post("/admin/accounts").send(newAccount({ password: "1234567" }))).status).toBe(400);
    expect((await agent.post("/admin/accounts").send(newAccount({ email: "pas-un-email" }))).status).toBe(400);
    expect((await agent.post("/admin/accounts").send(newAccount({ role: "customer" }))).status).toBe(400);
    expect((await agent.post("/admin/accounts").send(newAccount({ role: "patron" }))).status).toBe(400);
    expect((await agent.post("/admin/accounts").send(newAccount({ firstName: " " }))).status).toBe(400);
    expect(await prisma.user.count({ where: { email: "sami@dropzone.dz" } })).toBe(0);
  });
});

describe("GET /admin/accounts", () => {
  it("liste le personnel, jamais les clients, jamais un hash", async () => {
    await createUser("customer", "client@test.dz");
    await createUser("seller", "vendeur@test.dz");
    await createUser("order_manager", "responsable@test.dz");
    const { agent } = await loginAs("admin", "boss@test.dz");
    const response = await agent.get("/admin/accounts").expect(200);
    const emails = response.body.data.map((account: { email: string }) => account.email).sort();
    expect(emails).toEqual(["boss@test.dz", "responsable@test.dz", "vendeur@test.dz"]);
    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
    expect(response.body.data[0]).toHaveProperty("disabled");
  });
});

describe("PATCH /admin/accounts/:id", () => {
  it("change le rôle : le droit suit à la requête suivante", async () => {
    const seller = await loginAs("seller", "vendeur@test.dz");
    const { agent } = await loginAs("admin", "boss@test.dz");
    expect((await seller.agent.get("/admin/orders")).status).toBe(403);
    const response = await agent.patch(`/admin/accounts/${seller.user.id}`).send({ role: "order_manager" });
    expect(response.status).toBe(200);
    expect(response.body.data.role).toBe("order_manager");
    expect((await seller.agent.get("/admin/orders")).status).toBe(200);
  });

  it("désactive un vendeur connecté (refusé tout de suite), puis le réactive", async () => {
    const seller = await loginAs("seller", "vendeur@test.dz");
    const { agent } = await loginAs("admin", "boss@test.dz");
    await agent.patch(`/admin/accounts/${seller.user.id}`).send({ disabled: true }).expect(200);
    expect((await seller.agent.get("/admin/variants")).status).toBe(401);
    expect(await canLogin("vendeur@test.dz", PASSWORD)).toBe(false);
    await agent.patch(`/admin/accounts/${seller.user.id}`).send({ disabled: false }).expect(200);
    expect(await canLogin("vendeur@test.dz", PASSWORD)).toBe(true);
  });

  it("l'admin ne se rétrograde pas et ne se désactive pas lui-même", async () => {
    const { agent, user } = await loginAs("admin", "boss@test.dz");
    const demote = await agent.patch(`/admin/accounts/${user.id}`).send({ role: "seller" });
    expect(demote.status).toBe(409);
    expect((await agent.patch(`/admin/accounts/${user.id}`).send({ disabled: true })).status).toBe(409);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).role).toBe("admin");
  });

  it("un autre admin peut être rétrogradé ou désactivé par un admin actif", async () => {
    const other = await createUser("admin", "autre@test.dz");
    const { agent } = await loginAs("admin", "boss@test.dz");
    expect((await agent.patch(`/admin/accounts/${other.id}`).send({ role: "seller" })).status).toBe(200);
  });

  it("deux admins qui se désactivent en même temps : un seul y arrive, il reste toujours un admin actif", async () => {
    const a = await loginAs("admin", "a@test.dz");
    const b = await loginAs("admin", "b@test.dz");
    const results = await Promise.all([
      a.agent.patch(`/admin/accounts/${b.user.id}`).send({ disabled: true }),
      b.agent.patch(`/admin/accounts/${a.user.id}`).send({ disabled: true }),
    ]);
    // Le perdant est refusé soit à la connexion (401, son compte vient d'être désactivé), soit par la règle
    // du dernier admin (409) : cela dépend de l'instant où sa session est lue.
    const statuses = results.map((result) => result.status).sort();
    expect(statuses[0]).toBe(200);
    expect([401, 409]).toContain(statuses[1]);
    expect(await prisma.user.count({ where: { role: "admin", disabled: false } })).toBe(1);
  });

  it("le verrou du dernier admin : deux désactivations simultanées, une seule passe (409 pour l'autre)", async () => {
    const a = await createUser("admin", "a@test.dz");
    const b = await createUser("admin", "b@test.dz");
    const results = await Promise.allSettled([
      updateAccount(a.id, b.id, { disabled: true }),
      updateAccount(b.id, a.id, { disabled: true }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const refused = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(refused.reason).toMatchObject({ statusCode: 409, message: expect.stringMatching(/au moins un administrateur actif/) });
    expect(await prisma.user.count({ where: { role: "admin", disabled: false } })).toBe(1);
  });

  it("un client ou un compte inconnu : 404, un corps vide ou un rôle client : 400", async () => {
    const customer = await createUser("customer", "client@test.dz");
    const seller = await createUser("seller", "vendeur@test.dz");
    const { agent } = await loginAs("admin", "boss@test.dz");
    expect((await agent.patch(`/admin/accounts/${customer.id}`).send({ disabled: true })).status).toBe(404);
    expect((await agent.patch("/admin/accounts/99999").send({ disabled: true })).status).toBe(404);
    expect((await agent.patch(`/admin/accounts/${seller.id}`).send({})).status).toBe(400);
    expect((await agent.patch(`/admin/accounts/${seller.id}`).send({ role: "customer" })).status).toBe(400);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: customer.id } })).disabled).toBe(false);
  });
});

describe("POST /admin/accounts/:id/password", () => {
  it("donne un nouveau mot de passe à un vendeur : l'ancien ne marche plus", async () => {
    const seller = await createUser("seller", "vendeur@test.dz");
    const { agent } = await loginAs("admin", "boss@test.dz");
    const response = await agent.post(`/admin/accounts/${seller.id}/password`).send({ newPassword: "nouveaumotdepasse" });
    expect(response.status).toBe(200);
    expect(await canLogin("vendeur@test.dz", "nouveaumotdepasse")).toBe(true);
    expect(await canLogin("vendeur@test.dz", PASSWORD)).toBe(false);
  });

  it("refuse un mot de passe court, et ne touche ni un client ni un autre admin", async () => {
    const seller = await createUser("seller", "vendeur@test.dz");
    const customer = await createUser("customer", "client@test.dz");
    const other = await createUser("admin", "autre@test.dz");
    const { agent } = await loginAs("admin", "boss@test.dz");
    expect((await agent.post(`/admin/accounts/${seller.id}/password`).send({ newPassword: "court" })).status).toBe(400);
    expect((await agent.post(`/admin/accounts/${customer.id}/password`).send({ newPassword: "nouveaumotdepasse" })).status).toBe(404);
    expect((await agent.post(`/admin/accounts/${other.id}/password`).send({ newPassword: "nouveaumotdepasse" })).status).toBe(404);
    expect(await canLogin("autre@test.dz", PASSWORD)).toBe(true);
  });
});

describe("les comptes sont réservés à l'admin", () => {
  it.each(["seller", "order_manager", "customer"] as const)("%s reçoit 403 sur les quatre routes", async (role) => {
    const target = await createUser("seller", "cible@test.dz");
    const { agent } = await loginAs(role, `${role}@acces.dz`);
    expect((await agent.get("/admin/accounts")).status).toBe(403);
    expect((await agent.post("/admin/accounts").send(newAccount())).status).toBe(403);
    expect((await agent.patch(`/admin/accounts/${target.id}`).send({ disabled: true })).status).toBe(403);
    expect((await agent.post(`/admin/accounts/${target.id}/password`).send({ newPassword: "nouveaumotdepasse" })).status).toBe(403);
    expect(await canLogin("cible@test.dz", PASSWORD)).toBe(true);
    expect(await prisma.user.count({ where: { email: "sami@dropzone.dz" } })).toBe(0);
  });
});
