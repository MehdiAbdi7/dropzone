import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { screenSize } from "../src/utils/screenSize.js";
import { createCatalog, loginAs, resetDb } from "./helpers.js";

describe("screenSize", () => {
  it("arrondit au dixième et écrit avec une virgule", () => {
    expect(screenSize("6,71 pouces OLED, 1–120 Hz")).toBe("6,7 pouces");
  });
  it("garde une taille déjà au dixième", () => {
    expect(screenSize("6,9 pouces OLED Super Retina XDR")).toBe("6,9 pouces");
  });
  it("lit un point comme une virgule", () => {
    expect(screenSize("6.1 inch")).toBe("6,1 pouces");
  });
  it("rend null sans caractéristique", () => {
    expect(screenSize(undefined)).toBeNull();
  });
  it("rend null pour un texte vide", () => {
    expect(screenSize("")).toBeNull();
  });
  it("rend null sans nombre", () => {
    expect(screenSize("OLED")).toBeNull();
  });
});

describe("GET /admin/models/screen-sizes", () => {
  let catalog: Awaited<ReturnType<typeof createCatalog>>;

  beforeEach(async () => {
    await resetDb();
    catalog = await createCatalog();
  });

  it("refuse un client", async () => {
    const { agent } = await loginAs("customer");
    expect((await agent.get("/admin/models/screen-sizes")).status).toBe(403);
  });

  it("regroupe les téléphones par taille", async () => {
    await prisma.product.update({ where: { id: catalog.phone.id }, data: { specs: { Écran: "6,7 pouces OLED" } } });
    await prisma.product.create({
      data: {
        name: "Galaxy S24 Ultra",
        slug: "galaxy-s24-ultra",
        description: "Grand écran",
        categoryId: catalog.phones.id,
        deviceModelId: catalog.galaxy.id,
        status: "published",
        specs: { Écran: "6,8 pouces Dynamic AMOLED 2X" },
        variants: { create: [{ sku: "S24U-NEW", price: 170000, stock: 1 }] },
      },
    });
    const { agent } = await loginAs("admin");
    const response = await agent.get("/admin/models/screen-sizes");
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      { size: "6,7 pouces", models: [{ id: catalog.iphone.id, brand: "Apple", name: "iPhone 15 Pro Max" }] },
      { size: "6,8 pouces", models: [{ id: catalog.galaxy.id, brand: "Samsung", name: "Galaxy S24 Ultra" }] },
    ]);
  });
});
