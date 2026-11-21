import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { loginAs, resetDb } from "./helpers.js";

// Les catégories de pièces (21/11) : Batterie, Afficheur… créées à la main dans le back-office. Une pièce est
// toujours rangée dans une catégorie ; une catégorie qui contient des pièces ne se supprime pas (« refus »).
beforeEach(resetDb);

const admin = async () => (await loginAs("admin", `admin${Math.random()}@test.dz`)).agent;
type Agent = Awaited<ReturnType<typeof admin>>;

async function category(agent: Agent, name = "Batterie") {
  const response = await agent.post("/admin/part-categories").send({ name });
  expect(response.status, JSON.stringify(response.body)).toBe(201);
  return response.body.data as { id: number; name: string; partsCount: number };
}

const battery = { name: "Batterie iPhone 13", purchasePrice: 3_500, salePrice: 6_000 };

describe("POST /admin/part-categories", () => {
  it("crée une catégorie vide", async () => {
    const agent = await admin();
    expect(await category(agent, "Afficheur")).toMatchObject({ name: "Afficheur", partsCount: 0 });
  });

  it("refuse un nom vide ou trop long, et un doublon à la casse près", async () => {
    const agent = await admin();
    expect((await agent.post("/admin/part-categories").send({ name: "  " })).status).toBe(400);
    expect((await agent.post("/admin/part-categories").send({ name: "x".repeat(41) })).status).toBe(400);
    await category(agent, "Batterie");
    const dup = await agent.post("/admin/part-categories").send({ name: " batterie " });
    expect(dup.status).toBe(409);
    expect(dup.body.error.message).toBe("Une catégorie porte déjà ce nom");
  });
});

describe("GET /admin/part-categories", () => {
  it("liste par ordre alphabétique avec le nombre de pièces de chacune", async () => {
    const agent = await admin();
    const screens = await category(agent, "Afficheur");
    const batteries = await category(agent, "Batterie");
    await agent.post("/admin/parts").send({ ...battery, categoryId: batteries.id }).expect(201);
    await agent.post("/admin/parts").send({ ...battery, name: "Batterie 15", categoryId: batteries.id }).expect(201);
    const rows = (await agent.get("/admin/part-categories").expect(200)).body.data;
    expect(rows).toEqual([
      { id: screens.id, name: "Afficheur", partsCount: 0 },
      { id: batteries.id, name: "Batterie", partsCount: 2 },
    ]);
  });
});

describe("PATCH /admin/part-categories/:id", () => {
  it("renomme une catégorie", async () => {
    const agent = await admin();
    const created = await category(agent, "Batrie");
    const response = await agent.patch(`/admin/part-categories/${created.id}`).send({ name: "Batterie" }).expect(200);
    expect(response.body.data).toMatchObject({ id: created.id, name: "Batterie" });
  });

  it("refuse le nom d'une autre catégorie et une catégorie inconnue", async () => {
    const agent = await admin();
    await category(agent, "Batterie");
    const other = await category(agent, "Afficheur");
    expect((await agent.patch(`/admin/part-categories/${other.id}`).send({ name: "batterie" })).status).toBe(409);
    expect((await agent.patch("/admin/part-categories/99999").send({ name: "Caméra" })).status).toBe(404);
  });
});

describe("DELETE /admin/part-categories/:id", () => {
  it("supprime une catégorie vide", async () => {
    const agent = await admin();
    const created = await category(agent);
    await agent.delete(`/admin/part-categories/${created.id}`).expect(200);
    expect((await agent.get("/admin/part-categories").expect(200)).body.data).toEqual([]);
  });

  it("refuse une catégorie qui contient des pièces, avec un message qui dit quoi faire", async () => {
    const agent = await admin();
    const created = await category(agent);
    await agent.post("/admin/parts").send({ ...battery, categoryId: created.id }).expect(201);
    const response = await agent.delete(`/admin/part-categories/${created.id}`);
    expect(response.status).toBe(409);
    expect(response.body.error.message).toBe("Cette catégorie contient encore 1 pièce : vide-la d'abord (déplace ses pièces dans une autre catégorie).");
    expect(await prisma.partCategory.count()).toBe(1);
  });

  it("404 sur une catégorie inconnue", async () => {
    const agent = await admin();
    expect((await agent.delete("/admin/part-categories/99999")).status).toBe(404);
  });
});

describe("les pièces et leur catégorie", () => {
  it("une pièce se crée dans une catégorie et la réponse la porte", async () => {
    const agent = await admin();
    const created = await category(agent);
    const part = (await agent.post("/admin/parts").send({ ...battery, categoryId: created.id }).expect(201)).body.data;
    expect(part).toMatchObject({ name: "Batterie iPhone 13", categoryId: created.id });
  });

  it("refuse une pièce sans catégorie ou dans une catégorie inconnue", async () => {
    const agent = await admin();
    expect((await agent.post("/admin/parts").send(battery)).status).toBe(400);
    const unknown = await agent.post("/admin/parts").send({ ...battery, categoryId: 99999 });
    expect(unknown.status).toBe(400);
    expect(unknown.body.error.message).toBe("Cette catégorie n'existe pas");
  });

  it("une pièce change de catégorie par la modification", async () => {
    const agent = await admin();
    const from = await category(agent, "Batterie");
    const to = await category(agent, "Afficheur");
    const part = (await agent.post("/admin/parts").send({ ...battery, categoryId: from.id }).expect(201)).body.data;
    const moved = (await agent.patch(`/admin/parts/${part.id}`).send({ categoryId: to.id }).expect(200)).body.data;
    expect(moved.categoryId).toBe(to.id);
    expect((await agent.patch(`/admin/parts/${part.id}`).send({ categoryId: 99999 })).status).toBe(400);
  });
});

describe("les droits des catégories", () => {
  it("le technicien et le vendeur lisent la liste, seul l'admin crée, renomme et supprime", async () => {
    const admin1 = await admin();
    const created = await category(admin1);
    for (const role of ["technician", "seller"] as const) {
      const { agent } = await loginAs(role, `${role}${Math.random()}@test.dz`);
      await agent.get("/admin/part-categories").expect(200);
      expect((await agent.post("/admin/part-categories").send({ name: "Caméra" })).status).toBe(403);
      expect((await agent.patch(`/admin/part-categories/${created.id}`).send({ name: "Autre" })).status).toBe(403);
      expect((await agent.delete(`/admin/part-categories/${created.id}`)).status).toBe(403);
    }
  });
});
