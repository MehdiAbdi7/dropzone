import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { loginAs, resetDb } from "./helpers.js";

// Les horaires du magasin (14/11) : ils décident des créneaux de retrait proposés au client.
beforeEach(resetDb);

describe("GET /store/hours", () => {
  it("donne les horaires de départ à tout le monde", async () => {
    const response = await request(app).get("/store/hours");
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ openingTime: "09:00", closingTime: "20:00", closedDays: [] });
  });
});

describe("PUT /admin/store/hours", () => {
  it("enregistre les horaires réglés par l'admin", async () => {
    const { agent } = await loginAs("admin");
    const hours = { openingTime: "10:00", closingTime: "19:00", closedDays: [5] };
    expect((await agent.put("/admin/store/hours").send(hours)).status).toBe(200);
    expect((await request(app).get("/store/hours")).body.data).toEqual(hours);
  });

  it("refuse un client", async () => {
    const { agent } = await loginAs("customer");
    const response = await agent.put("/admin/store/hours").send({ openingTime: "10:00", closingTime: "19:00", closedDays: [] });
    expect(response.status).toBe(403);
  });

  it("refuse une fermeture avant l'ouverture, une heure hors demi-heure et un jour inconnu", async () => {
    const { agent } = await loginAs("admin");
    const put = (body: object) => agent.put("/admin/store/hours").send(body);
    expect((await put({ openingTime: "19:00", closingTime: "10:00", closedDays: [] })).status).toBe(400);
    expect((await put({ openingTime: "10:15", closingTime: "19:00", closedDays: [] })).status).toBe(400);
    expect((await put({ openingTime: "10:00", closingTime: "19:00", closedDays: [7] })).status).toBe(400);
    expect((await put({ openingTime: "10:00", closingTime: "19:00", closedDays: [5, 5] })).status).toBe(400);
  });
});
