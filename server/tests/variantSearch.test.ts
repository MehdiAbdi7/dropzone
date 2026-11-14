import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { createCatalog, loginAs, resetDb } from "./helpers.js";

// Le sélecteur de variantes du comptoir (16/11, lot 3).
beforeEach(async () => {
  await resetDb();
  await createCatalog();
  await prisma.productVariant.update({ where: { sku: "IP-NEW-256" }, data: { purchasePrice: 200_000 } });
});

const search = async (q: string, extra = "") => {
  const { agent } = await loginAs("admin", `admin${Math.random()}@test.dz`);
  return agent.get(`/admin/variants?q=${encodeURIComponent(q)}${extra}`);
};

describe("GET /admin/variants", () => {
  it("trouve une variante par un morceau du nom du produit, sans tenir compte de la casse", async () => {
    const response = await search("IPHONE");
    expect(response.status).toBe(200);
    const skus = response.body.data.map((hit: { sku: string }) => hit.sku);
    expect(skus).toContain("IP-NEW-256");
    expect(skus).toContain("IP-R-DEAL");
    expect(response.body.data[0]).toMatchObject({ productName: "iPhone 15 Pro Max" });
  });

  it("trouve une variante par son SKU, et met le SKU exact en premier", async () => {
    const response = await search("ip-new-256");
    expect(response.body.data[0]).toMatchObject({
      sku: "IP-NEW-256",
      price: 245_000,
      stock: 3,
      condition: "new",
      options: { Stockage: "256 Go" },
    });
  });

  it("n'offre que ce qui se vend : ni brouillon, ni stock à 0", async () => {
    const skus = (await search("galaxy")).body.data.map((hit: { sku: string }) => hit.sku);
    expect(skus).not.toContain("ZFLIP6");
    const sold = (await search("iphone")).body.data.map((hit: { sku: string }) => hit.sku);
    expect(sold).not.toContain("IP-R-SOLD");
  });

  it("donne la fiche d'état d'une affaire", async () => {
    const hit = (await search("IP-R-DEAL")).body.data[0];
    expect(hit.condition).toBe("refurbished");
    expect(hit.conditionReport).toContain("Batterie 95 %");
  });

  it("répond au plus 20 résultats et refuse une recherche trop courte", async () => {
    expect((await search("a")).status).toBe(400);
    expect((await search("x".repeat(61))).status).toBe(400);
    expect((await search("iphone", "&limit=500")).status).toBe(400);
    expect((await search("iphone", "&limit=2")).body.data).toHaveLength(2);
  });

  it("ne montre ni prix d'achat ni rien de secret", async () => {
    const text = JSON.stringify((await search("iphone")).body);
    for (const secret of ["purchasePrice", "unitCost", "profit", "grade", "batteryHealth"]) {
      expect(text).not.toContain(secret);
    }
    expect(text).not.toContain("200000");
  });

  it("est réservé à l'admin", async () => {
    expect((await request(app).get("/admin/variants?q=iphone")).status).toBe(401);
    const { agent } = await loginAs("customer");
    expect((await agent.get("/admin/variants?q=iphone")).status).toBe(403);
  });
});
