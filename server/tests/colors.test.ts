import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { loginAs, resetDb } from "./helpers.js";

// La teinte de chaque couleur (décision de Mehdi du 04/11) : réglée dans Listes, elle donne
// la pastille et la lueur de l'affiche. Avant, elle était écrite dans le front, et une
// couleur ajoutée par le gérant (« Orange ») retombait sur une lueur violette.
let admin: Awaited<ReturnType<typeof loginAs>>["agent"];

beforeEach(async () => {
  await resetDb();
  ({ agent: admin } = await loginAs("admin"));
});

describe("La teinte d'une couleur dans Listes", () => {
  it("crée une couleur avec sa teinte, écrite en minuscules", async () => {
    const response = await admin.post("/admin/choices").send({ group: "color", label: "Orange", hex: "#F47D3C" });
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ label: "Orange", hex: "#f47d3c" });
    const list = await admin.get("/admin/choices");
    expect(list.body.data.color).toEqual([expect.objectContaining({ label: "Orange", hex: "#f47d3c" })]);
  });

  it("refuse une nouvelle couleur sans teinte, ou avec une teinte illisible", async () => {
    expect((await admin.post("/admin/choices").send({ group: "color", label: "Orange" })).status).toBe(400);
    expect((await admin.post("/admin/choices").send({ group: "color", label: "Orange", hex: "orange" })).status).toBe(400);
  });

  it("refuse une teinte sur une autre liste que les couleurs", async () => {
    const response = await admin.post("/admin/choices").send({ group: "storage", label: "4 To", hex: "#000000" });
    expect(response.status).toBe(400);
  });

  it("change la teinte d'une couleur, et seulement d'une couleur", async () => {
    const orange = await prisma.choice.create({ data: { group: "color", label: "Orange" } });
    const response = await admin.patch(`/admin/choices/${orange.id}`).send({ hex: "#F47D3C" });
    expect(response.status).toBe(200);
    expect(response.body.data.hex).toBe("#f47d3c");
    const storage = await prisma.choice.create({ data: { group: "storage", label: "4 To" } });
    expect((await admin.patch(`/admin/choices/${storage.id}`).send({ hex: "#000000" })).status).toBe(400);
  });
});

describe("GET /colors : la palette publique", () => {
  it("donne la teinte de chaque couleur qui en a une", async () => {
    await prisma.choice.createMany({
      data: [
        { group: "color", label: "Orange", hex: "#f47d3c" },
        { group: "color", label: "Transparent" },
        { group: "storage", label: "256 Go" },
      ],
    });
    const response = await request(app).get("/colors");
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ Orange: "#f47d3c" });
  });
});
